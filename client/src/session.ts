import { Game, makeConfig, Rng, type Action, type Config, type GameEvent } from '@bop/core';
import { STRATEGIES, strategy, type Bot, type BotSkill } from '@bop/sim';

export type Seat = 'human' | keyof typeof STRATEGIES;

export interface SessionOptions {
  seats: Seat[];
  overrides: Partial<Config>;
  skill: BotSkill;
}

/**
 * Runs one match in the browser: the authoritative Game, the bots, and the human seat.
 * Later this same role moves to a host tab or server; the UI only talks to it via
 * observe(), act() and drained events.
 */
export class Session {
  readonly game: Game;
  readonly seats: Seat[];
  readonly human: number | null;
  private bots: (Bot | null)[];
  private acc = 0;
  private nextDecision = 0;
  speed = 1;
  paused = false;
  readonly humanActions: { t: number; action: Action }[] = [];
  readonly humanEvents: GameEvent[] = [];

  constructor(opts: SessionOptions) {
    const cfg = makeConfig(opts.overrides);
    this.game = new Game(cfg);
    this.seats = opts.seats;
    const h = opts.seats.indexOf('human');
    this.human = h >= 0 ? h : null;
    const rng = new Rng(cfg.seed * 7919 + 1);
    this.bots = opts.seats.map((s, i) => (s === 'human' ? null : strategy(s, opts.skill)(i, rng)));
    this.skill = opts.skill;
  }

  readonly skill: BotSkill;

  /** Skip the rest of the blind pick phase. */
  ready() {
    this.game.act(this.human ?? 0, { type: 'ready' });
  }

  get done() {
    return this.game.done;
  }

  /** Smooth time for drawing: game time plus the unfinished part of the current tick. */
  get renderTime() {
    return this.game.t + Math.min(this.acc, this.game.cfg.tickSec);
  }

  /** Advance by real elapsed seconds. Returns events for the human seat (or seat 0 when spectating). */
  update(realDt: number): GameEvent[] {
    const out: GameEvent[] = [];
    if (this.paused || this.done) return out;
    const { tickSec } = this.game.cfg;
    this.acc += Math.min(realDt, 0.25) * this.speed;
    while (this.acc >= tickSec && !this.game.done) {
      if (this.game.t >= this.nextDecision - 1e-9) {
        this.bots.forEach((b, p) => {
          if (!b) return;
          for (const a of b.decide(this.game.observe(p))) this.game.act(p, a);
        });
        this.nextDecision += 1;
      }
      this.game.step();
      this.acc -= tickSec;
    }
    const viewer = this.human ?? 0;
    const evs = this.game.drainEvents(viewer);
    for (let p = 0; p < this.seats.length; p++) if (p !== viewer) this.game.drainEvents(p);
    this.humanEvents.push(...evs);
    out.push(...evs);
    return out;
  }

  act(action: Action) {
    if (this.human === null || this.done) return;
    this.humanActions.push({ t: this.game.t, action });
    this.game.act(this.human, action);
  }

  /** Everything needed to analyse a playtest afterwards. */
  telemetry() {
    const g = this.game;
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      config: g.cfg,
      seats: this.seats,
      botSkill: this.skill,
      human: this.human,
      finalMoney: g.money,
      served: g.served,
      snapshots: g.snapshots,
      reportLog: g.reportLog,
      tipLog: g.tipLog,
      shiftTimes: g.shiftTimes,
      headlines: g.headlines,
      humanActions: this.humanActions,
      watchedRate: g.tableFinishes ? g.watchedFinishes / g.tableFinishes : 0,
    };
  }
}
