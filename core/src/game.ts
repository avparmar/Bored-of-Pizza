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
  CustomerState,
  CustomerView,
  GameEvent,
  Headline,
  Leg,
  Observation,
  PublicWaiterView,
  Recipe,
  Report,
  TableView,
  Vec,
} from './types.js';

interface Customer extends Leg {
  id: number;
  restaurant: number;
  state: CustomerState;
  recipe?: Recipe;
  idealAtOrder?: Recipe;
  orderedAt?: number;
  readyAt?: number;
  table?: number;
  finishAt?: number;
}

interface Waiter extends Leg {
  owner: number;
  idx: number;
  target: number | null;
  stationed: number | null;
  /** When the table it's stationed at last became empty (for auto-return). */
  idleSince: number | null;
  /** Customer to follow to their table once they get their pizza. */
  follow: number | null;
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

/** Normalize weights into shares, then hold each share within [floor, cap] (water-filling). */
export function clampShares(weights: number[], floor: number, cap: number): number[] {
  const n = weights.length;
  const fixed: (number | null)[] = new Array(n).fill(null);
  for (let iter = 0; iter < n + 1; iter++) {
    const freeIdx = weights.map((_, i) => i).filter((i) => fixed[i] === null);
    const left = 1 - fixed.reduce<number>((a, b) => a + (b ?? 0), 0);
    const wsum = freeIdx.reduce((a, i) => a + weights[i], 0);
    const shares = weights.map((w, i) =>
      fixed[i] !== null ? fixed[i]! : wsum > 0 ? (w / wsum) * left : left / freeIdx.length,
    );
    // Fix cap violations first; only then floors (fixing both at once can lose mass).
    const over = freeIdx.filter((i) => shares[i] > cap + 1e-12);
    const under = freeIdx.filter((i) => shares[i] < floor - 1e-12);
    if (over.length) for (const i of over) fixed[i] = cap;
    else if (under.length) for (const i of under) fixed[i] = floor;
    else return shares;
  }
  return fixed.map((x) => x ?? 0);
}

export function legPos(l: Leg, t: number): Vec {
  if (t >= l.arriveAt || l.arriveAt <= l.departAt) return l.to;
  if (t <= l.departAt) return l.from;
  const f = (t - l.departAt) / (l.arriveAt - l.departAt);
  return { x: l.from.x + (l.to.x - l.from.x) * f, y: l.from.y + (l.to.y - l.from.y) * f };
}

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
  readonly doorPos: Vec[];
  readonly entrances: Vec[];
  readonly tables: Table[];
  readonly waiters: Waiter[];
  readonly reports: Report[][];
  readonly startingIntel: ({ ingredient: number; value: number } | null)[];
  readonly headlines: Headline[] = [];
  private readonly events: GameEvent[][];
  /** Per-player shuffled ingredient bags for reports. */
  private readonly reportBags: number[][];

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
  /** Gradual trend shifts: ingredient -> target value and when to take the next step. */
  private ramps = new Map<number, { target: number; every: number; next: number }>();
  /** Seconds of blind pick left before doors open. */
  pregameLeft: number;

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
    this.events = Array.from({ length: n }, () => []);
    this.reportBags = Array.from({ length: n }, () => []);

    const corners: Vec[] = [
      { x: 1, y: 1 },
      { x: S - 1, y: 1 },
      { x: 1, y: S - 1 },
      { x: S - 1, y: S - 1 },
    ];
    this.restaurantPos = Array.from({ length: n }, (_, i) => corners[i % 4]);
    // The door faces the middle of the court.
    this.doorPos = this.restaurantPos.map((p) => ({
      x: p.x + (p.x < S / 2 ? 2.5 : -2.5),
      y: p.y + (p.y < S / 2 ? 2.5 : -2.5),
    }));
    // Mall corridors open onto the middle of each side.
    this.entrances = [
      { x: S / 2, y: -1 },
      { x: S + 1, y: S / 2 },
      { x: S / 2, y: S + 1 },
      { x: -1, y: S / 2 },
    ];

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
        const home = this.doorPos[p];
        this.waiters.push({
          owner: p,
          idx: w,
          from: home,
          to: home,
          departAt: 0,
          arriveAt: 0,
          target: null,
          stationed: null,
          idleSince: null,
          follow: null,
        });
      }
    }

    const perm = this.rng.shuffle([0, 1, 2, 3]);
    this.startingIntel = Array.from({ length: n }, (_, p) =>
      cfg.startingIntel ? { ingredient: perm[p % 4], value: this.ideal[perm[p % 4]] } : null,
    );

    this.nextArrival = this.rng.exp(cfg.arrivalMeanSec);
    this.nextDrift = cfg.driftEverySec;
    this.pregameLeft = cfg.pregameSec;
  }

  get phase(): 'pregame' | 'open' {
    return this.pregameLeft > 0 ? 'pregame' : 'open';
  }

  private openDoors() {
    this.pregameLeft = 0;
    // Reveal everyone's opening recipe.
    this.recipes.forEach((r, p) =>
      this.emit('all', { type: 'recipe', t: this.t, restaurant: p, recipe: [...r] as Recipe }),
    );
  }

  get t(): number {
    return this.tick * this.cfg.tickSec;
  }

  get done(): boolean {
    return this.t >= this.cfg.durationSec;
  }

  private emit(to: number | 'all', e: GameEvent) {
    if (to === 'all') for (const q of this.events) q.push(e);
    else this.events[to].push(e);
  }

  /** Events for one player since the last call. */
  drainEvents(player: number): GameEvent[] {
    const out = this.events[player];
    this.events[player] = [];
    return out;
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
      const target = clamp(this.ideal[i] + dir * size, 1, scale);
      const steps = Math.abs(target - this.ideal[i]);
      if (this.cfg.trendShiftRampSec > 0 && steps > 0) {
        const every = this.cfg.trendShiftRampSec / steps;
        this.ramps.set(i, { target, every, next: this.t + every });
      } else {
        this.ideal[i] = target;
      }
    }
    const named =
      this.cfg.headlineNames === 'all' ? [...picks].sort() : this.cfg.headlineNames === 'one' ? [picks[0]] : [];
    this.headlines.push({ t: this.t, ingredients: named });
    this.shiftTimes.push(this.t);
    this.emit('all', { type: 'headline', t: this.t, ingredients: named });
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
    return clampShares(w, this.cfg.shareFloor, this.cfg.shareCap);
  }

  private setLeg(m: Leg, to: Vec, speed: number) {
    const here = legPos(m, this.t);
    m.from = here;
    m.to = to;
    m.departAt = this.t;
    m.arriveAt = this.t + dist(here, to) / speed;
  }

  private spawnCustomer() {
    const r = this.rng.weighted(this.shares());
    const door = this.doorPos[r];
    const c: Customer = {
      id: this.nextCustomerId++,
      restaurant: r,
      state: 'queued',
      from: door,
      to: door,
      departAt: this.t,
      arriveAt: this.t,
    };
    this.customers.set(c.id, c);
    if (this.cfg.customerWalkIn) {
      // Come in from the entrance nearest the chosen shop (ties broken randomly).
      const ds = this.entrances.map((e) => dist(e, door));
      const best = Math.min(...ds);
      const options = this.entrances.filter((_, i) => ds[i] - best < 1e-6);
      c.from = this.rng.pick(options);
      c.arriveAt = this.t + dist(c.from, door) / this.cfg.customerSpeed;
      c.state = 'entering';
    } else {
      this.queues[r].push(c.id);
    }
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
    const door = this.doorPos[c.restaurant];
    const free = this.tables.filter((tb) => tb.customer === null);
    if (free.length === 0) {
      for (const w of this.waiters) if (w.follow === c.id) w.follow = null;
      this.takeouts++;
      this.finish(c);
      return;
    }
    const tb = free[this.rng.weighted(free.map((f) => 1 / Math.pow(dist(door, f.pos), 2)))];
    tb.customer = c.id;
    let covered = false;
    for (const w of this.waiters) {
      if (w.follow === c.id) {
        w.follow = null;
        this.assignWaiter(w, tb.id);
        covered = true;
      }
    }
    if (this.cfg.autoFollow && !covered) {
      const mine = this.waiters.filter((w) => w.owner === c.restaurant);
      if (!mine.some((w) => w.target === tb.id)) {
        const free = mine.filter((w) => this.isFree(w));
        if (free.length) {
          const best = free.reduce((a, b) =>
            dist(legPos(a, this.t), tb.pos) <= dist(legPos(b, this.t), tb.pos) ? a : b,
          );
          this.assignWaiter(best, tb.id);
        }
      }
    }
    c.table = tb.id;
    c.state = 'walking';
    c.from = door;
    c.to = tb.pos;
    c.departAt = this.t;
    c.arriveAt = this.t + dist(door, tb.pos) / this.cfg.customerSpeed;
    c.finishAt = c.arriveAt + this.cfg.eatSec;
  }

  private finish(c: Customer) {
    const { cfg } = this;
    const d = distance(c.recipe!, c.idealAtOrder!, cfg);
    const noise = 1 + cfg.tipNoise * (2 * this.rng.next() - 1);
    const tip = cfg.tipBase * Math.exp(-cfg.tipK * d) * noise;
    this.money[c.restaurant] += tip;
    this.tipLog.push({ t: this.t, restaurant: c.restaurant, tip, distance: d });
    this.emit(c.restaurant, {
      type: 'tip',
      t: this.t,
      restaurant: c.restaurant,
      amount: tip,
      table: c.table ?? null,
    });

    const h = this.accHistory[c.restaurant];
    h.push({ t: this.t, acc: accuracy(c.recipe!, c.idealAtOrder!, cfg) });
    if (h.length > cfg.shareWindow) h.shift();

    if (c.table !== undefined) {
      const tb = this.tables[c.table];
      this.tableFinishes++;
      const w = tb.stationed;
      if (w) {
        this.watchedFinishes++;
        this.deliverReport(w.owner, c, 'waiter');
        if (cfg.waiterAutoReturn) this.sendHome(w);
      }
      tb.customer = null;
    }
    if (this.rng.next() < cfg.commentCardRate) this.deliverReport(c.restaurant, c, 'card');

    if (cfg.customerWalkIn) {
      const here = legPos(c, this.t);
      const exit = this.entrances.reduce((a, b) => (dist(a, here) <= dist(b, here) ? a : b));
      c.state = 'leaving';
      this.setLeg(c, exit, cfg.customerSpeed);
    } else {
      this.customers.delete(c.id);
    }
  }

  private nextReportIngredient(to: number): number {
    if (!this.cfg.reportBag) return this.rng.int(0, 3);
    const bag = this.reportBags[to];
    if (bag.length === 0) bag.push(...this.rng.shuffle([0, 1, 2, 3]));
    return bag.pop()!;
  }

  private deliverReport(to: number, c: Customer, source: 'waiter' | 'card') {
    const { cfg } = this;
    const i = this.nextReportIngredient(to);
    const value = c.recipe![i];
    const idealV = c.idealAtOrder![i];
    const direction = directionOf(value, idealV);
    const showMag =
      direction !== 'right' &&
      (cfg.magnitude === 'all' || (cfg.magnitude === 'own' && to === c.restaurant));
    const d = distance(c.recipe!, c.idealAtOrder!, cfg);
    const report: Report = {
      id: this.nextReportId++,
      to,
      about: c.restaurant,
      recipe: [...c.recipe!] as Recipe,
      ingredient: i,
      direction,
      magnitude: showMag ? magnitudeOf(value, idealV, cfg) : null,
      verdict: cfg.reportVerdict ? (d <= 2 ? 'good' : d <= 5 ? 'ok' : 'bad') : null,
      table: c.table ?? null,
      orderedAt: c.orderedAt!,
      deliveredAt: this.t,
      source,
    };
    this.reports[to].push(report);
    this.emit(to, { type: 'report', t: this.t, report });
    this.reportLog.push({
      ...report,
      idealAtOrder: idealV,
      idealAtDelivery: this.ideal[i],
      staleDirection: directionOf(value, this.ideal[i]) !== direction,
    });
  }

  // ---------------------------------------------------------------- waiters

  private isFree(w: Waiter) {
    return w.target === null && w.follow === null;
  }

  private unstation(w: Waiter) {
    if (w.stationed !== null) {
      this.tables[w.stationed].stationed = null;
      w.stationed = null;
    }
    w.idleSince = null;
  }

  private sendHome(w: Waiter) {
    this.unstation(w);
    w.target = null;
    this.setLeg(w, this.doorPos[w.owner], this.cfg.waiterSpeed);
  }

  private assignWaiter(w: Waiter, table: number | null) {
    if (table !== null && (table < 0 || table >= this.tables.length)) return;
    if (table !== null && w.target === table) return;
    this.unstation(w);
    if (table === null) {
      if (this.cfg.waiterAutoReturn) {
        this.sendHome(w);
      } else {
        const here = legPos(w, this.t);
        Object.assign(w, { from: here, to: here, departAt: this.t, arriveAt: this.t, target: null });
      }
      return;
    }
    w.target = table;
    this.setLeg(w, this.tables[table].pos, this.cfg.waiterSpeed);
  }

  private waiterState(w: Waiter): 'home' | 'out' | 'returning' {
    if (w.target !== null) return 'out';
    return this.t >= w.arriveAt && dist(w.to, this.doorPos[w.owner]) < 1e-6 ? 'home' : 'returning';
  }

  // ---------------------------------------------------------------- public API

  act(player: number, action: Action) {
    if (action.type === 'ready') {
      if (this.phase === 'pregame') this.openDoors();
      return;
    }
    if (action.type === 'setRecipe') {
      const next = clampRecipe(action.recipe, this.cfg.scale);
      if (this.phase === 'pregame') {
        this.recipes[player] = next; // free and secret until doors open
        return;
      }
      const points = rawDistance(next, this.recipes[player]);
      if (points === 0) return;
      this.recipes[player] = next;
      this.closedUntil[player] =
        Math.max(this.closedUntil[player], this.t) + points * this.cfg.retoolSecPerPoint;
      this.money[player] -= points * this.cfg.retoolCostPerPoint;
      this.recipeChanges[player]++;
      this.emit('all', { type: 'recipe', t: this.t, restaurant: player, recipe: [...next] as Recipe });
    } else if (this.phase === 'pregame') {
      return;
    } else if (action.type === 'followCustomer') {
      const c = this.customers.get(action.customer);
      if (!c || c.restaurant !== player) return;
      if (c.state === 'leaving' || (c.state === 'seated' && this.t >= c.finishAt!)) return;
      const mine = this.waiters.filter((w) => w.owner === player);
      if (mine.some((w) => w.follow === c.id || (c.table !== undefined && w.target === c.table))) return;
      const free = mine.filter((w) => this.isFree(w));
      if (free.length === 0) return;
      const door = this.doorPos[player];
      const best = free.reduce((a, b) =>
        dist(legPos(a, this.t), door) <= dist(legPos(b, this.t), door) ? a : b,
      );
      if (c.table !== undefined) {
        this.assignWaiter(best, c.table);
      } else {
        // Wait at the shop; set off as soon as they pick a table.
        this.sendHome(best);
        best.follow = c.id;
      }
    } else if (action.type === 'recallWaiter') {
      const w = this.waiters.find((x) => x.owner === player && x.idx === action.idx);
      if (w) {
        w.follow = null;
        this.sendHome(w);
      }
    } else if (action.type === 'assignWaiter') {
      const w = this.waiters.find((x) => x.owner === player && x.idx === action.idx);
      if (w) this.assignWaiter(w, action.table);
    } else if (action.type === 'sendWaiter') {
      const tb = this.tables[action.table];
      if (!tb) return;
      const mine = this.waiters.filter((w) => w.owner === player);
      if (mine.some((w) => w.target === action.table)) return;
      let free = mine.filter((w) => this.isFree(w));
      if (free.length === 0) {
        // All busy: re-send one whose table has nobody to listen to (never one mid-meal).
        free = mine.filter(
          (w) => w.follow === null && w.target !== null && this.tables[w.target].customer === null,
        );
      }
      if (free.length === 0) return;
      const best = free.reduce((a, b) =>
        dist(legPos(a, this.t), tb.pos) <= dist(legPos(b, this.t), tb.pos) ? a : b,
      );
      this.assignWaiter(best, action.table);
    }
  }

  /** Advance one tick. */
  step() {
    const { cfg } = this;
    if (this.phase === 'pregame') {
      this.pregameLeft -= cfg.tickSec;
      if (this.pregameLeft <= 1e-9) this.openDoors();
      return;
    }
    const t = this.t;

    for (const [i, r] of this.ramps) {
      while (t >= r.next && this.ideal[i] !== r.target) {
        this.ideal[i] += Math.sign(r.target - this.ideal[i]);
        r.next += r.every;
      }
      if (this.ideal[i] === r.target) this.ramps.delete(i);
    }

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

    for (const c of [...this.customers.values()]) {
      if (c.state === 'entering' && t >= c.arriveAt) {
        c.state = 'queued';
        this.queues[c.restaurant].push(c.id);
      } else if (c.state === 'walking' && t >= c.arriveAt) {
        c.state = 'seated';
      } else if (c.state === 'seated' && t >= c.finishAt!) {
        this.finish(c);
      } else if (c.state === 'leaving' && t >= c.arriveAt) {
        this.customers.delete(c.id);
      }
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

    for (const w of this.waiters) {
      if (w.target !== null && w.stationed === null && t >= w.arriveAt) {
        const tb = this.tables[w.target];
        if (tb.stationed && tb.stationed !== w) {
          // Lost the race: someone is already there.
          this.emit(w.owner, { type: 'blocked', t, table: tb.id });
          if (cfg.waiterAutoReturn) this.sendHome(w);
          else w.target = null;
        } else {
          tb.stationed = w;
          w.stationed = tb.id;
        }
      }
      if (cfg.waiterAutoReturn && w.stationed !== null) {
        const tb = this.tables[w.stationed];
        if (tb.customer !== null) w.idleSince = null;
        else if (w.idleSince === null) w.idleSince = t;
        else if (t - w.idleSince >= cfg.waiterIdleReturnSec) this.sendHome(w);
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
    const t = this.t;
    const tables: TableView[] = this.tables.map((tb) => {
      const c = tb.customer !== null ? this.customers.get(tb.customer)! : null;
      return {
        id: tb.id,
        pos: tb.pos,
        customer: c
          ? {
              restaurant: c.restaurant,
              seated: c.state === 'seated',
              arriveAt: c.arriveAt,
              finishAt: c.finishAt!,
            }
          : null,
        waiters: this.waiters
          .filter((w) => w.target === tb.id)
          .map((w) => ({ owner: w.owner, arrived: w.stationed === tb.id })),
      };
    });
    const customers: CustomerView[] = [...this.customers.values()].map((c) => ({
      id: c.id,
      restaurant: c.restaurant,
      state: c.state,
      from: c.from,
      to: c.to,
      departAt: c.departAt,
      arriveAt: c.arriveAt,
      queueIdx: c.state === 'queued' ? this.queues[c.restaurant].indexOf(c.id) : -1,
      table: c.table ?? null,
      hasPizza: c.state === 'walking' || c.state === 'seated',
    }));
    const waiters: PublicWaiterView[] = this.waiters.map((w) => ({
      owner: w.owner,
      idx: w.idx,
      state: this.waiterState(w),
      target: w.target,
      stationed: w.stationed,
      from: w.from,
      to: w.to,
      departAt: w.departAt,
      arriveAt: w.arriveAt,
    }));
    const hidden = this.phase === 'pregame';
    return {
      t,
      me: player,
      cfg: this.cfg,
      phase: this.phase,
      pregameLeft: Math.max(0, this.pregameLeft),
      recipes: this.recipes.map((r, p) => (hidden && p !== player ? [0, 0, 0, 0] : [...r]) as Recipe),
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
          pos: legPos(w, t),
          target: w.target,
          arriveAt: w.arriveAt,
          stationed: w.stationed,
          follow: w.follow,
        })),
      restaurantPos: this.restaurantPos,
      doorPos: this.doorPos,
      entrances: this.entrances,
      customers,
      waiters,
    };
  }
}
