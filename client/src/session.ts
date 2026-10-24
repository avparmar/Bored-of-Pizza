import { Game, makeConfig, Rng, type Action, type Config, type GameEvent } from '@bop/core';
import { STRATEGIES, strategy, type Bot, type BotSkill } from '@bop/sim';
import type { EndData, Match } from './match.js';

export type Seat = 'human' | keyof typeof STRATEGIES;

export interface SessionOptions {
  seats: Seat[];
  overrides: Partial<Config>;
  skill: BotSkill;
  /** Which human seat this tab plays (defaults to the first human seat). */
  localSeat?: number;
  names?: string[];
}

/**
 * Runs one match in this tab: the authoritative Game, the bots, and any human seats.
 * Used directly for solo play, and wrapped by the network host for multiplayer.
 */
export class Session implements Match {
  readonly game: Game;
  readonly seats: Seat[];
  readonly names: string[];
  readonly human: number | null;
  readonly skill: BotSkill;
  readonly multiplayer: boolean = false;
  readonly canControlTime: boolean = true;
  private bots: (Bot | null)[];
  private rng: Rng;
  private acc = 0;
  private nextDecision = 0;
  /** Events waiting for other human seats (the network host forwards them). */
  private pending = new Map<number, GameEvent[]>();
  speed = 1;
  paused = false;
  /** Longest real-time gap one update may cover (larger lets a throttled background tab catch up). */
  maxStep = 0.25;
  readonly humanActions: { t: number; seat: number; action: Action }[] = [];

  constructor(opts: SessionOptions) {
    const cfg = makeConfig(opts.overrides);
    this.game = new Game(cfg);
    this.seats = opts.seats;
    this.names = opts.names ?? opts.seats.map(() => '');
    const first = opts.seats.indexOf('human');
    this.human = opts.localSeat ?? (first >= 0 ? first : null);
    this.rng = new Rng(cfg.seed * 7919 + 1);
    this.skill = opts.skill;
    this.bots = opts.seats.map((s, i) => (s === 'human' ? null : strategy(s, opts.skill)(i, this.rng)));
  }

  get cfg() {
    return this.game.cfg;
  }

  get ideal() {
    return this.game.ideal;
  }

  /** Seats played by people (in this tab or remotely). */
  get humanSeats(): number[] {
    return this.seats.map((s, i) => (s === 'human' ? i : -1)).filter((i) => i >= 0);
  }

  /** Skip the rest of the blind pick phase (bots still get to make their blind pick first). */
  ready() {
    if (this.game.phase === 'pregame' && this.nextDecision === 0) {
      this.runBots();
      this.nextDecision = 1;
    }
    this.game.act(this.human ?? 0, { type: 'ready' });
  }

  /** A player left: a bot takes over their shop from here on. */
  replaceWithBot(seat: number, name = 'hybrid') {
    if (this.seats[seat] !== 'human') return;
    this.seats[seat] = name as Seat;
    this.bots[seat] = strategy(name, this.skill)(seat, this.rng);
  }

  private runBots() {
    this.bots.forEach((b, p) => {
      if (!b) return;
      for (const a of b.decide(this.game.observe(p))) this.game.act(p, a);
    });
  }

  get done() {
    return this.game.done;
  }

  /** Smooth time for drawing: game time plus the unfinished part of the current tick. */
  get renderTime() {
    return this.game.t + Math.min(this.acc, this.game.cfg.tickSec);
  }

  obs() {
    return this.game.observe(this.human ?? 0);
  }

  /** Advance by real elapsed seconds. Returns events for this tab's seat (or seat 0 when spectating). */
  update(realDt: number): GameEvent[] {
    if (this.paused || this.done) return [];
    const { tickSec } = this.game.cfg;
    this.acc += Math.min(realDt, this.maxStep) * this.speed;
    while (this.acc >= tickSec && !this.game.done) {
      if (this.game.t >= this.nextDecision - 1e-9) {
        this.runBots();
        this.nextDecision += 1;
      }
      this.game.step();
      this.acc -= tickSec;
    }
    const viewer = this.human ?? 0;
    let mine: GameEvent[] = [];
    for (let p = 0; p < this.seats.length; p++) {
      const evs = this.game.drainEvents(p);
      if (p === viewer) mine = evs;
      else if (this.seats[p] === 'human') this.pending.set(p, [...(this.pending.get(p) ?? []), ...evs]);
    }
    return mine;
  }

  /** Events collected for another human seat since the last call. */
  takePending(seat: number) {
    const evs = this.pending.get(seat) ?? [];
    this.pending.set(seat, []);
    return evs;
  }

  act(action: Action) {
    if (this.human === null) return;
    this.actAs(this.human, action);
  }

  actAs(seat: number, action: Action) {
    if (this.done) return;
    this.humanActions.push({ t: this.game.t, seat, action });
    this.game.act(seat, action);
  }

  endData(): EndData {
    const g = this.game;
    return {
      seats: [...this.seats],
      names: [...this.names],
      human: this.human,
      cfg: g.cfg,
      money: [...g.money],
      served: [...g.served],
      recipeChanges: [...g.recipeChanges],
      ideal: [...g.ideal] as EndData['ideal'],
      shiftTimes: [...g.shiftTimes],
      snapshots: g.snapshots,
      reportLog: g.reportLog,
    };
  }

  dispose() {}

  /** Everything needed to analyse a playtest afterwards. */
  telemetry() {
    const g = this.game;
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      ...this.endData(),
      botSkill: this.skill,
      tipLog: g.tipLog,
      headlines: g.headlines,
      humanActions: this.humanActions,
      watchedRate: g.tableFinishes ? g.watchedFinishes / g.tableFinishes : 0,
    };
  }
}
