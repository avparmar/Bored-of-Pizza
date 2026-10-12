import type { Action, Observation, Recipe } from '@bop/core';
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

export const STRATEGIES: Record<string, BotFactory> = {
  static: staticBot,
  searcher: searcherBot,
  copycat: copycatBot,
  hybrid: hybridBot,
  hawk: hawkBot,
};
