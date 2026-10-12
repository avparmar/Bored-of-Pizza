import type { Config } from './config.js';
import { Rng } from './rng.js';
import {
  accuracy,
  clamp,
  clampRecipe,
  directionOf,
  distance,
  magnitudeOf,
  rawDistance,
} from './recipe.js';
import type {
  Action,
  Headline,
  Observation,
  Recipe,
  Report,
  TableView,
  Vec,
} from './types.js';

interface Customer {
  id: number;
  restaurant: number;
  state: 'queued' | 'cooking' | 'walking' | 'seated';
  recipe?: Recipe;
  idealAtOrder?: Recipe;
  orderedAt?: number;
  readyAt?: number;
  table?: number;
  arriveAt?: number;
  finishAt?: number;
}

interface Waiter {
  owner: number;
  idx: number;
  from: Vec;
  to: Vec;
  departAt: number;
  arriveAt: number;
  target: number | null;
  stationed: number | null;
}

interface Table {
  id: number;
  pos: Vec;
  customer: number | null;
  stationed: Waiter | null;
}

/** Extra bookkeeping on each report so the sim can measure staleness. */
export interface ReportLogEntry extends Report {
  /** Ideal value of that ingredient at delivery time. */
  idealAtDelivery: number;
  /** Ideal value of that ingredient when ordered. */
  idealAtOrder: number;
  /** True if the direction would be different if judged at delivery time. */
  staleDirection: boolean;
}

export interface Snapshot {
  t: number;
  ideal: Recipe;
  recipes: Recipe[];
  money: number[];
  served: number[];
}

export interface TipLogEntry {
  t: number;
  restaurant: number;
  tip: number;
  distance: number;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The authoritative game. Holds secrets (the ideal recipe); players only ever see `observe()`.
 * Pure and deterministic given cfg.seed: no I/O, no wall clock.
 */
export class Game {
  readonly cfg: Config;
  readonly rng: Rng;
  tick = 0;

  ideal: Recipe;
  readonly recipes: Recipe[];
  readonly money: number[];
  readonly served: number[];
  readonly closedUntil: number[];
  readonly recipeChanges: number[];
  readonly accHistory: { t: number; acc: number }[][];
  readonly queues: number[][];
  readonly cooking: (number | null)[];
  readonly restaurantPos: Vec[];
  readonly tables: Table[];
  readonly waiters: Waiter[];
  readonly reports: Report[][];
  readonly startingIntel: ({ ingredient: number; value: number } | null)[];
  readonly headlines: Headline[] = [];

  // Logs for analysis
  readonly snapshots: Snapshot[] = [];
  readonly reportLog: ReportLogEntry[] = [];
  readonly tipLog: TipLogEntry[] = [];
  readonly shiftTimes: number[] = [];
  takeouts = 0;
  /** Customers who finished eating at a table. */
  tableFinishes = 0;
  /** ...of which had a waiter stationed at their table when they finished. */
  watchedFinishes = 0;

  private customers = new Map<number, Customer>();
  private nextCustomerId = 1;
  private nextReportId = 1;
  private nextArrival: number;
  private nextDrift: number;
  private shiftIdx = 0;

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.rng = new Rng(cfg.seed);
    const n = cfg.players;
    const S = cfg.courtSize;

    this.ideal = [0, 1, 2, 3].map(() => this.randomIdealValue()) as Recipe;
    const mid = Math.round((cfg.scale + 1) / 2);
    this.recipes = Array.from({ length: n }, () => [mid, mid, mid, mid] as Recipe);
    this.money = new Array(n).fill(0);
    this.served = new Array(n).fill(0);
    this.closedUntil = new Array(n).fill(0);
    this.recipeChanges = new Array(n).fill(0);
    this.accHistory = Array.from({ length: n }, () => []);
    this.queues = Array.from({ length: n }, () => []);
    this.cooking = new Array(n).fill(null);
    this.reports = Array.from({ length: n }, () => []);

    const corners: Vec[] = [
      { x: 1, y: 1 },
      { x: S - 1, y: 1 },
      { x: 1, y: S - 1 },
      { x: S - 1, y: S - 1 },
    ];
    this.restaurantPos = Array.from({ length: n }, (_, i) => corners[i % 4]);

    this.tables = [];
    const g = cfg.tableGrid;
    const lo = S * 0.25;
    const hi = S * 0.75;
    for (let r = 0; r < g; r++) {
      for (let c = 0; c < g; c++) {
        const step = g > 1 ? (hi - lo) / (g - 1) : 0;
        this.tables.push({
          id: this.tables.length,
          pos: { x: lo + c * step, y: lo + r * step },
          customer: null,
          stationed: null,
        });
      }
    }

    this.waiters = [];
    for (let p = 0; p < n; p++) {
      for (let w = 0; w < cfg.waitersPerPlayer; w++) {
        const home = this.restaurantPos[p];
        this.waiters.push({
          owner: p,
          idx: w,
          from: home,
          to: home,
          departAt: 0,
          arriveAt: 0,
          target: null,
          stationed: null,
        });
      }
    }

    const perm = this.rng.shuffle([0, 1, 2, 3]);
    this.startingIntel = Array.from({ length: n }, (_, p) =>
      cfg.startingIntel ? { ingredient: perm[p % 4], value: this.ideal[perm[p % 4]] } : null,
    );

    this.nextArrival = this.rng.exp(cfg.arrivalMeanSec);
    this.nextDrift = cfg.driftEverySec;
  }

  get t(): number {
    return this.tick * this.cfg.tickSec;
  }

  get done(): boolean {
    return this.t >= this.cfg.durationSec;
  }

  // ---------------------------------------------------------------- ideal recipe

  private randomIdealValue(): number {
    const { scale, idealEdgeBias } = this.cfg;
    if (this.rng.next() < idealEdgeBias) {
      const band = Math.max(1, Math.floor(scale / 4));
      return this.rng.next() < 0.5 ? this.rng.int(1, band) : this.rng.int(scale - band + 1, scale);
    }
    return this.rng.int(1, scale);
  }

  private drift() {
    const i = this.rng.int(0, 3);
    const step = this.cfg.driftStep * (this.rng.next() < 0.5 ? -1 : 1);
    let v = this.ideal[i] + step;
    if (v < 1 || v > this.cfg.scale) v = this.ideal[i] - step;
    this.ideal[i] = clamp(v, 1, this.cfg.scale);
  }

  private trendShift() {
    const { scale, trendShiftSize, trendShiftIngredients } = this.cfg;
    const picks = this.rng.shuffle([0, 1, 2, 3]).slice(0, trendShiftIngredients);
    for (const i of picks) {
      const size = this.rng.int(
        Math.max(1, Math.round(trendShiftSize[0] * scale)),
        Math.max(1, Math.round(trendShiftSize[1] * scale)),
      );
      let dir = this.rng.next() < 0.5 ? -1 : 1;
      if (this.ideal[i] + dir * size < 1 || this.ideal[i] + dir * size > scale) dir = -dir;
      this.ideal[i] = clamp(this.ideal[i] + dir * size, 1, scale);
    }
    this.headlines.push({ t: this.t, ingredient: picks[0] });
    this.shiftTimes.push(this.t);
  }

  // ---------------------------------------------------------------- customers

  /** Mean accuracy of a restaurant's recent pizzas, or null if it has none recent enough. */
  private rawScore(r: number): number | null {
    const cutoff = this.t - this.cfg.shareMaxAgeSec;
    const h = this.accHistory[r].filter((e) => e.t >= cutoff);
    if (h.length === 0) return null;
    return h.reduce((a, e) => a + e.acc, 0) / h.length;
  }

  private scores(): number[] {
    const raw = this.recipes.map((_, r) => this.rawScore(r));
    const known = raw.filter((x): x is number => x !== null);
    const fallback = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
    return raw.map((x) => x ?? fallback);
  }

  queueLength(r: number): number {
    return this.queues[r].length + (this.cooking[r] !== null ? 1 : 0);
  }

  /** Current probability that a new customer picks each restaurant. */
  shares(): number[] {
    const scores = this.scores();
    const w = scores.map(
      (sc, r) => Math.pow(sc, this.cfg.shareP) / (1 + this.cfg.queuePenalty * this.queueLength(r)),
    );
    const total = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / total);
  }

  private spawnCustomer() {
    const r = this.rng.weighted(this.shares());
    const c: Customer = { id: this.nextCustomerId++, restaurant: r, state: 'queued' };
    this.customers.set(c.id, c);
    this.queues[r].push(c.id);
  }

  private startOrder(r: number) {
    const id = this.queues[r].shift()!;
    const c = this.customers.get(id)!;
    c.state = 'cooking';
    c.recipe = [...this.recipes[r]] as Recipe;
    c.idealAtOrder = [...this.ideal] as Recipe;
    c.orderedAt = this.t;
    c.readyAt = this.t + this.cfg.serviceSec;
    this.cooking[r] = id;
  }

  private depart(c: Customer) {
    this.cooking[c.restaurant] = null;
    this.served[c.restaurant]++;
    const home = this.restaurantPos[c.restaurant];
    const free = this.tables.filter((tb) => tb.customer === null);
    if (free.length === 0) {
      this.takeouts++;
      this.finish(c);
      return;
    }
    const tb = free[this.rng.weighted(free.map((f) => 1 / Math.pow(dist(home, f.pos), 2)))];
    tb.customer = c.id;
    c.table = tb.id;
    c.state = 'walking';
    c.arriveAt = this.t + dist(home, tb.pos) / this.cfg.customerSpeed;
    c.finishAt = c.arriveAt + this.cfg.eatSec;
  }

  private finish(c: Customer) {
    const { cfg } = this;
    const d = distance(c.recipe!, c.idealAtOrder!, cfg);
    const noise = 1 + cfg.tipNoise * (2 * this.rng.next() - 1);
    const tip = cfg.tipBase * Math.exp(-cfg.tipK * d) * noise;
    this.money[c.restaurant] += tip;
    this.tipLog.push({ t: this.t, restaurant: c.restaurant, tip, distance: d });

    const h = this.accHistory[c.restaurant];
    h.push({ t: this.t, acc: accuracy(c.recipe!, c.idealAtOrder!, cfg) });
    if (h.length > cfg.shareWindow) h.shift();

    if (c.table !== undefined) {
      const tb = this.tables[c.table];
      this.tableFinishes++;
      if (tb.stationed) {
        this.watchedFinishes++;
        this.deliverReport(tb.stationed.owner, c, 'waiter');
      }
      tb.customer = null;
    }
    if (this.rng.next() < cfg.commentCardRate) this.deliverReport(c.restaurant, c, 'card');
    this.customers.delete(c.id);
  }

  private deliverReport(to: number, c: Customer, source: 'waiter' | 'card') {
    const { cfg } = this;
    const i = this.rng.int(0, 3);
    const value = c.recipe![i];
    const idealV = c.idealAtOrder![i];
    const direction = directionOf(value, idealV);
    const showMag =
      direction !== 'right' &&
      (cfg.magnitude === 'all' || (cfg.magnitude === 'own' && to === c.restaurant));
    const report: Report = {
      id: this.nextReportId++,
      to,
      about: c.restaurant,
      recipe: [...c.recipe!] as Recipe,
      ingredient: i,
      direction,
      magnitude: showMag ? magnitudeOf(value, idealV, cfg) : null,
      orderedAt: c.orderedAt!,
      deliveredAt: this.t,
      source,
    };
    this.reports[to].push(report);
    this.reportLog.push({
      ...report,
      idealAtOrder: idealV,
      idealAtDelivery: this.ideal[i],
      staleDirection: directionOf(value, this.ideal[i]) !== direction,
    });
  }

  // ---------------------------------------------------------------- waiters

  private waiterPos(w: Waiter): Vec {
    const t = this.t;
    if (t >= w.arriveAt || w.arriveAt <= w.departAt) return w.to;
    const f = (t - w.departAt) / (w.arriveAt - w.departAt);
    return { x: w.from.x + (w.to.x - w.from.x) * f, y: w.from.y + (w.to.y - w.from.y) * f };
  }

  private assignWaiter(w: Waiter, table: number | null) {
    if (table !== null && (table < 0 || table >= this.tables.length)) return;
    if (table !== null && (w.target === table)) return;
    const here = this.waiterPos(w);
    if (w.stationed !== null) {
      this.tables[w.stationed].stationed = null;
      w.stationed = null;
    }
    w.from = here;
    w.departAt = this.t;
    if (table === null) {
      w.to = here;
      w.arriveAt = this.t;
      w.target = null;
      return;
    }
    w.to = this.tables[table].pos;
    w.arriveAt = this.t + dist(here, w.to) / this.cfg.waiterSpeed;
    w.target = table;
  }

  // ---------------------------------------------------------------- public API

  act(player: number, action: Action) {
    if (action.type === 'setRecipe') {
      const next = clampRecipe(action.recipe, this.cfg.scale);
      const points = rawDistance(next, this.recipes[player]);
      if (points === 0) return;
      this.recipes[player] = next;
      this.closedUntil[player] =
        Math.max(this.closedUntil[player], this.t) + points * this.cfg.retoolSecPerPoint;
      this.money[player] -= points * this.cfg.retoolCostPerPoint;
      this.recipeChanges[player]++;
    } else if (action.type === 'assignWaiter') {
      const w = this.waiters.find((x) => x.owner === player && x.idx === action.idx);
      if (w) this.assignWaiter(w, action.table);
    }
  }

  /** Advance one tick. */
  step() {
    const { cfg } = this;
    const t = this.t;

    while (t >= this.nextDrift) {
      this.drift();
      this.nextDrift += cfg.driftEverySec;
    }
    while (this.shiftIdx < cfg.trendShiftTimes.length && t >= cfg.trendShiftTimes[this.shiftIdx]) {
      this.trendShift();
      this.shiftIdx++;
    }
    while (t >= this.nextArrival) {
      this.spawnCustomer();
      this.nextArrival += this.rng.exp(cfg.arrivalMeanSec);
    }

    for (let r = 0; r < cfg.players; r++) {
      const cid = this.cooking[r];
      if (cid !== null) {
        const c = this.customers.get(cid)!;
        if (t >= c.readyAt!) this.depart(c);
      }
      if (this.cooking[r] === null && this.queues[r].length > 0 && t >= this.closedUntil[r]) {
        this.startOrder(r);
      }
    }

    for (const c of [...this.customers.values()]) {
      if (c.state === 'walking' && t >= c.arriveAt!) c.state = 'seated';
      if (c.state === 'seated' && t >= c.finishAt!) this.finish(c);
    }

    for (const w of this.waiters) {
      if (w.target !== null && w.stationed === null && t >= w.arriveAt) {
        const tb = this.tables[w.target];
        if (tb.stationed && tb.stationed !== w) {
          w.target = null; // lost the race: someone is already there
        } else {
          tb.stationed = w;
          w.stationed = tb.id;
        }
      }
    }

    if (this.tick % Math.round(1 / cfg.tickSec) === 0) {
      this.snapshots.push({
        t,
        ideal: [...this.ideal] as Recipe,
        recipes: this.recipes.map((r) => [...r] as Recipe),
        money: [...this.money],
        served: [...this.served],
      });
    }
    this.tick++;
  }

  observe(player: number): Observation {
    const tables: TableView[] = this.tables.map((tb) => {
      const c = tb.customer !== null ? this.customers.get(tb.customer)! : null;
      return {
        id: tb.id,
        pos: tb.pos,
        customer: c
          ? {
              restaurant: c.restaurant,
              seated: c.state === 'seated',
              arriveAt: c.arriveAt!,
              finishAt: c.finishAt!,
            }
          : null,
        waiters: this.waiters
          .filter((w) => w.target === tb.id)
          .map((w) => ({ owner: w.owner, arrived: w.stationed === tb.id })),
      };
    });
    return {
      t: this.t,
      me: player,
      cfg: this.cfg,
      recipes: this.recipes.map((r) => [...r] as Recipe),
      money: [...this.money],
      queues: this.recipes.map((_, r) => this.queueLength(r)),
      closedUntil: [...this.closedUntil],
      served: [...this.served],
      headlines: [...this.headlines],
      reports: this.reports[player],
      startingIntel: this.startingIntel[player],
      tables,
      myWaiters: this.waiters
        .filter((w) => w.owner === player)
        .map((w) => ({
          idx: w.idx,
          pos: this.waiterPos(w),
          target: w.target,
          arriveAt: w.arriveAt,
          stationed: w.stationed,
        })),
      restaurantPos: this.restaurantPos,
    };
  }
}
