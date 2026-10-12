import {
  intervalFromReport,
  type Action,
  type Config,
  type Observation,
  type Recipe,
  type Report,
  type Rng,
} from '@bop/core';

export interface Bot {
  name: string;
  decide(obs: Observation): Action[];
}

export type BotFactory = (player: number, rng: Rng) => Bot;

/**
 * What a bot believes about the ideal: an interval [lo, hi] per ingredient.
 * Reports narrow it; time and headlines widen it again (the ideal moves).
 */
export class Belief {
  lo: number[];
  hi: number[];
  private lastWiden = 0;
  private headlinesSeen = 0;
  private reportsSeen = 0;

  constructor(private cfg: Config) {
    this.lo = [1, 1, 1, 1];
    this.hi = [cfg.scale, cfg.scale, cfg.scale, cfg.scale];
  }

  set(i: number, lo: number, hi: number) {
    this.lo[i] = Math.max(1, lo);
    this.hi[i] = Math.min(this.cfg.scale, hi);
  }

  apply(r: Report) {
    const v = r.recipe[r.ingredient];
    const [lo, hi] = intervalFromReport(v, r.direction, r.magnitude, this.cfg);
    const i = r.ingredient;
    const nlo = Math.max(lo, this.lo[i]);
    const nhi = Math.min(hi, this.hi[i]);
    // Contradiction means the ideal moved: trust the newer report.
    if (nlo > nhi) this.set(i, lo, hi);
    else this.set(i, nlo, nhi);
  }

  /** Process new reports (filtered) and widen for elapsed drift and headlines. */
  update(obs: Observation, accept: (r: Report) => boolean) {
    const { cfg } = this;
    // Drift moves each ingredient ~1 step per (4 * driftEverySec) on average.
    const widenEvery = 4 * cfg.driftEverySec;
    while (obs.t - this.lastWiden >= widenEvery) {
      this.lastWiden += widenEvery;
      for (let i = 0; i < 4; i++) this.set(i, this.lo[i] - cfg.driftStep, this.hi[i] + cfg.driftStep);
    }
    for (; this.headlinesSeen < obs.headlines.length; this.headlinesSeen++) {
      const h = obs.headlines[this.headlinesSeen];
      this.set(h.ingredient, 1, cfg.scale);
      // Another, unnamed ingredient also shifted: loosen everything a bit.
      const extra = Math.round(cfg.scale * 0.15);
      for (let i = 0; i < 4; i++) this.set(i, this.lo[i] - extra, this.hi[i] + extra);
    }
    for (; this.reportsSeen < obs.reports.length; this.reportsSeen++) {
      const r = obs.reports[this.reportsSeen];
      if (accept(r)) this.apply(r);
    }
  }

  guess(): Recipe {
    return this.lo.map((lo, i) => Math.round((lo + this.hi[i]) / 2)) as Recipe;
  }
}

/** Starting recipe: middle of the range, plus the one ingredient we were told. */
export function startingRecipe(obs: Observation): Recipe {
  const mid = Math.round((obs.cfg.scale + 1) / 2);
  const r: Recipe = [mid, mid, mid, mid];
  if (obs.startingIntel) r[obs.startingIntel.ingredient] = obs.startingIntel.value;
  return r;
}

export function sameRecipe(a: Recipe, b: Recipe) {
  return a.every((v, i) => v === b[i]);
}

/** Tracks public money over time so bots can estimate who is earning fastest. */
export class GainTracker {
  private history: { t: number; money: number[] }[] = [];
  constructor(private windowSec = 30) {}

  update(obs: Observation) {
    this.history.push({ t: obs.t, money: [...obs.money] });
    while (this.history.length > 2 && obs.t - this.history[1].t >= this.windowSec) this.history.shift();
  }

  /** Money earned per player over roughly the last window. */
  gains(): number[] {
    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    return last.money.map((m, i) => m - first.money[i]);
  }

  ready(obs: Observation) {
    return obs.t >= this.windowSec;
  }
}

/**
 * Send waiters to tables whose diner belongs to a wanted restaurant.
 * `priority(restaurant)` returns a rank (lower = better) or null to ignore that restaurant.
 */
export function waiterActions(
  obs: Observation,
  priority: (restaurant: number) => number | null,
): Action[] {
  const actions: Action[] = [];
  const { t, cfg } = obs;
  const claimed = new Set<number>();

  const tableWorthIt = (tableId: number, arriveAt: number) => {
    const tb = obs.tables[tableId];
    if (!tb.customer) return false;
    if (priority(tb.customer.restaurant) === null) return false;
    // Must arrive before the diner finishes.
    if (arriveAt > tb.customer.finishAt - 0.2) return false;
    // Someone else already standing there wins.
    if (tb.waiters.some((w) => w.owner !== obs.me && w.arrived)) return false;
    return true;
  };

  // Keep waiters that are already on a useful table.
  const free: typeof obs.myWaiters = [];
  for (const w of obs.myWaiters) {
    const tableId = w.stationed ?? w.target;
    if (tableId !== null && tableWorthIt(tableId, w.stationed !== null ? t : w.arriveAt)) {
      claimed.add(tableId);
    } else {
      free.push(w);
    }
  }

  for (const w of free) {
    let best: { id: number; rank: number; eta: number } | null = null;
    for (const tb of obs.tables) {
      if (claimed.has(tb.id) || !tb.customer) continue;
      const eta = t + Math.hypot(tb.pos.x - w.pos.x, tb.pos.y - w.pos.y) / cfg.waiterSpeed;
      if (!tableWorthIt(tb.id, eta)) continue;
      const rank = priority(tb.customer.restaurant)!;
      if (!best || rank < best.rank || (rank === best.rank && eta < best.eta)) {
        best = { id: tb.id, rank, eta };
      }
    }
    if (best) {
      claimed.add(best.id);
      actions.push({ type: 'assignWaiter', idx: w.idx, table: best.id });
    }
  }
  return actions;
}

/**
 * An opening that doesn't give the tip-off away: the known ingredient is nudged by up to ±2,
 * the rest are plausible random values.
 */
export function bluffOpening(obs: Observation, rng: Rng): Recipe {
  const { scale } = obs.cfg;
  const r = [0, 1, 2, 3].map(() => rng.int(Math.round(scale * 0.3), Math.round(scale * 0.7))) as Recipe;
  if (obs.startingIntel) {
    const { ingredient, value } = obs.startingIntel;
    r[ingredient] = Math.max(1, Math.min(scale, value + rng.int(-2, 2)));
  }
  return r;
}

/**
 * Wraps any bot so that it (1) picks a bluffing opening during the blind pick phase, and
 * (2) keeps that opening until it has some intel (2 reports or 20s), so its tip-off isn't
 * revealed the moment doors open. The inner bot still sees every observation.
 */
export function withOpening(inner: BotFactory): BotFactory {
  return (player, rng) => {
    const bot = inner(player, rng);
    let opening: Recipe | null = null;
    return {
      name: bot.name,
      decide(obs) {
        if (obs.phase === 'pregame') {
          opening ??= bluffOpening(obs, rng);
          return [{ type: 'setRecipe', recipe: opening }];
        }
        const acts = bot.decide(obs);
        const holding = opening !== null && obs.reports.length < 2 && obs.t < 20;
        return holding ? acts.filter((a) => a.type !== 'setRecipe') : acts;
      },
    };
  };
}

export interface HumanizeOptions {
  /** Seconds between "looks" at the court. */
  thinkEvery: number;
  /** Delay before a decision takes effect: [min, max] seconds. */
  reaction: [number, number];
  /** Waiter orders allowed per look. */
  waiterOrders: number;
}

export const HUMAN_LIKE: HumanizeOptions = { thinkEvery: 2, reaction: [0.8, 2], waiterOrders: 1 };

/** Makes a bot play at human speed: it looks every few seconds, reacts late, and sends fewer waiters. */
export function humanize(inner: BotFactory, opts: HumanizeOptions = HUMAN_LIKE): BotFactory {
  return (player, rng) => {
    const bot = inner(player, rng);
    let lastThink = -Infinity;
    const pending: { at: number; actions: Action[] }[] = [];
    return {
      name: bot.name,
      decide(obs) {
        if (obs.phase === 'pregame') return bot.decide(obs);
        if (obs.t - lastThink >= opts.thinkEvery - 1e-9) {
          lastThink = obs.t;
          const acts = bot.decide(obs);
          let orders = 0;
          const kept = acts.filter((a) => {
            if (a.type === 'setRecipe') return true;
            return orders++ < opts.waiterOrders;
          });
          if (kept.length) {
            const [lo, hi] = opts.reaction;
            pending.push({ at: obs.t + lo + rng.next() * (hi - lo), actions: kept });
          }
        }
        const due: Action[] = [];
        for (let i = pending.length - 1; i >= 0; i--) {
          if (pending[i].at <= obs.t + 1e-9) {
            due.unshift(...pending[i].actions);
            pending.splice(i, 1);
          }
        }
        return due;
      },
    };
  };
}
