import { rawDistance, type Action, type Observation, type Recipe } from '@bop/core';
import {
  Belief,
  GainTracker,
  sameRecipe,
  startingRecipe,
  waiterActions,
  type BotFactory,
} from './common.js';

/** Picks a recipe at the start (using its starting intel) and never changes it. */
export const staticBot: BotFactory = (_player, rng) => {
  let done = false;
  return {
    name: 'static',
    decide(obs) {
      if (done) return [];
      done = true;
      const r = startingRecipe(obs);
      for (let i = 0; i < 4; i++) {
        if (obs.startingIntel?.ingredient !== i) r[i] = rng.int(1, obs.cfg.scale);
      }
      return [{ type: 'setRecipe', recipe: r }];
    },
  };
};

/**
 * Narrows each ingredient using intel about its OWN pizza only, and always serves the middle
 * of what it believes. Waiters watch its own customers.
 */
export const searcherBot: BotFactory = () => {
  let belief: Belief | null = null;
  return {
    name: 'searcher',
    decide(obs) {
      if (!belief) {
        belief = new Belief(obs.cfg);
        if (obs.startingIntel) {
          const { ingredient, value } = obs.startingIntel;
          belief.set(ingredient, value, value);
        }
      }
      belief.update(obs, (r) => r.about === obs.me);
      const actions: Action[] = [];
      const want = belief.guess();
      if (!sameRecipe(want, obs.recipes[obs.me])) actions.push({ type: 'setRecipe', recipe: want });
      actions.push(...waiterActions(obs, (r) => (r === obs.me ? 0 : null)));
      return actions;
    },
  };
};

/**
 * Free rider: no intel of its own. Copies whichever rival earned the most recently.
 * Waiters stay home.
 */
export const copycatBot: BotFactory = () => {
  const gains = new GainTracker(30);
  let lastCopy = -Infinity;
  return {
    name: 'copycat',
    decide(obs) {
      gains.update(obs);
      if (obs.t === 0) return [{ type: 'setRecipe', recipe: startingRecipe(obs) }];
      if (!gains.ready(obs) || obs.t - lastCopy < 5) return [];
      const g = gains.gains();
      let leader = -1;
      for (let p = 0; p < g.length; p++) {
        if (p !== obs.me && (leader < 0 || g[p] > g[leader])) leader = p;
      }
      if (g[leader] > g[obs.me] * 1.15 && !sameRecipe(obs.recipes[leader], obs.recipes[obs.me])) {
        lastCopy = obs.t;
        return [{ type: 'setRecipe', recipe: [...obs.recipes[leader]] as Recipe }];
      }
      return [];
    },
  };
};

function intelBot(
  name: string,
  waiterPriority: (obs: Observation, leader: number) => (r: number) => number | null,
  copyThreshold: number | null,
): BotFactory {
  return () => {
    let belief: Belief | null = null;
    const gains = new GainTracker(30);
    let lastCopy = -Infinity;
    return {
      name,
      decide(obs) {
        if (!belief) {
          belief = new Belief(obs.cfg);
          if (obs.startingIntel) {
            const { ingredient, value } = obs.startingIntel;
            belief.set(ingredient, value, value);
          }
        }
        gains.update(obs);
        belief.update(obs, () => true);

        let leader = -1;
        const g = gains.gains();
        for (let p = 0; p < g.length; p++) {
          if (p !== obs.me && (leader < 0 || g[p] > g[leader])) leader = p;
        }

        const actions: Action[] = [];
        if (
          copyThreshold !== null &&
          gains.ready(obs) &&
          obs.t - lastCopy > 30 &&
          g[leader] > g[obs.me] * copyThreshold &&
          !sameRecipe(obs.recipes[leader], obs.recipes[obs.me])
        ) {
          // Jump to the leader's recipe and keep searching from there.
          lastCopy = obs.t;
          const theirs = obs.recipes[leader];
          for (let i = 0; i < 4; i++) {
            const lo = Math.max(belief.lo[i], theirs[i] - 2);
            const hi = Math.min(belief.hi[i], theirs[i] + 2);
            if (lo <= hi) belief.set(i, lo, hi);
            else belief.set(i, theirs[i] - 2, theirs[i] + 2);
          }
          actions.push({ type: 'setRecipe', recipe: [...theirs] as Recipe });
        } else {
          const want = belief.guess();
          if (!sameRecipe(want, obs.recipes[obs.me])) actions.push({ type: 'setRecipe', recipe: want });
        }
        actions.push(...waiterActions(obs, waiterPriority(obs, leader)));
        return actions;
      },
    };
  };
}

/** Searches using ALL intel (own and rival), and copies a rival that is clearly earning more. */
export const hybridBot = intelBot(
  'hybrid',
  (obs) => (r) => (r === obs.me ? 0 : 1),
  1.3,
);

/** Searches using all intel, but sends waiters after the current leader's customers first. */
export const hawkBot = intelBot(
  'hawk',
  (obs, leader) => (r) => (r === leader ? 0 : r === obs.me ? 2 : 1),
  null,
);

/**
 * Uses everything a sharp human could: all intel, plus "doing the math" on public numbers.
 * Each restaurant's average tip per pizza (change in money / change in customers served)
 * reveals roughly how far its public recipe is from the ideal. With four recipes and four
 * distance estimates, the bot searches for the ideal that best fits them, constrained by its
 * intel intervals. Tip noise is the main defence against this.
 */
export const analystBot: BotFactory = () => {
  let belief: Belief | null = null;
  const history: { t: number; money: number[]; served: number[]; recipes: Recipe[] }[] = [];
  const lastChange: number[] = [];
  let lastRecipes: Recipe[] | null = null;
  let best: Recipe | null = null;
  const WINDOW = 30;
  const LAG = 8; // money arrives ~walk + eat time after the customer is served

  return {
    name: 'analyst',
    decide(obs) {
      const { cfg, t } = obs;
      if (!belief) {
        belief = new Belief(cfg);
        if (obs.startingIntel) {
          const { ingredient, value } = obs.startingIntel;
          belief.set(ingredient, value, value);
        }
      }
      belief.update(obs, () => true);

      // Track public numbers and when each recipe last changed.
      obs.recipes.forEach((r, i) => {
        if (!lastRecipes || !sameRecipe(r, lastRecipes[i])) lastChange[i] = t;
      });
      lastRecipes = obs.recipes.map((r) => [...r] as Recipe);
      history.push({ t, money: [...obs.money], served: [...obs.served], recipes: lastRecipes });
      while (history.length && history[0].t < t - WINDOW - LAG - 2) history.shift();

      const actions: Action[] = [];
      if (Math.round(t) % 3 === 0) {
        // Estimate each restaurant's raw distance from its recent tip per pizza.
        const at = (time: number) => history.find((h) => h.t >= time) ?? history[0];
        const now = history[history.length - 1];
        const estimates: { recipe: Recipe; dist: number; w: number }[] = [];
        for (let r = 0; r < obs.recipes.length; r++) {
          const start = Math.max(t - WINDOW, lastChange[r] + LAG);
          if (t - start < 10) continue;
          const dm = now.money[r] - at(start).money[r];
          const ds = at(t - LAG).served[r] - at(start - LAG).served[r];
          if (ds < 2) continue;
          const avgTip = Math.min(Math.max(dm / ds, 0.05), cfg.tipBase * 1.2);
          const d = Math.max(0, -Math.log(avgTip / cfg.tipBase) / cfg.tipK) * (cfg.scale / 10);
          // Tiny tips say "far away" but not how far: trust them less.
          const w = (Math.min(ds, 6) / 6) * (avgTip > 1 ? 1 : 0.3);
          estimates.push({ recipe: obs.recipes[r], dist: d, w });
        }

        const b = belief;
        const score = (c: number[]) => {
          let s = 0;
          for (const e of estimates) {
            const diff = rawDistance(c as Recipe, e.recipe) - e.dist;
            s += e.w * diff * diff;
          }
          for (let i = 0; i < 4; i++) {
            const out = Math.max(0, b.lo[i] - c[i], c[i] - b.hi[i]);
            s += 3 * out * out;
          }
          return s;
        };

        // Hill-climb from a few starting points.
        const starts: Recipe[] = [b.guess(), ...obs.recipes];
        if (best) starts.push(best);
        let bestScore = Infinity;
        let bestC: number[] = b.guess();
        for (const st of starts) {
          let c = [...st];
          let sc = score(c);
          for (let iter = 0; iter < 60; iter++) {
            let improved = false;
            for (let i = 0; i < 4; i++) {
              for (const step of [1, -1, 2, -2, 4, -4]) {
                const v = c[i] + step;
                if (v < 1 || v > cfg.scale) continue;
                const n = [...c];
                n[i] = v;
                const ns = score(n);
                if (ns < sc - 1e-9) {
                  c = n;
                  sc = ns;
                  improved = true;
                }
              }
            }
            if (!improved) break;
          }
          if (sc < bestScore) {
            bestScore = sc;
            bestC = c;
          }
        }
        best = bestC as Recipe;
      }
      const want = best ?? belief.guess();
      if (!sameRecipe(want, obs.recipes[obs.me])) actions.push({ type: 'setRecipe', recipe: want });
      actions.push(...waiterActions(obs, (r) => (r === obs.me ? 0 : 1)));
      return actions;
    },
  };
};

export const STRATEGIES: Record<string, BotFactory> = {
  analyst: analystBot,
  static: staticBot,
  searcher: searcherBot,
  copycat: copycatBot,
  hybrid: hybridBot,
  hawk: hawkBot,
};
