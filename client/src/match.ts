import type { Action, Config, GameEvent, Observation, Recipe, ReportLogEntry, Snapshot } from '@bop/core';

/** Everything the end screen needs. The host sends this to every player when the match ends. */
export interface EndData {
  seats: string[];
  names: string[];
  /** Seat of the player looking at it (null for spectators). */
  human: number | null;
  cfg: Config;
  money: number[];
  served: number[];
  recipeChanges: number[];
  ideal: Recipe;
  shiftTimes: number[];
  snapshots: Snapshot[];
  reportLog: ReportLogEntry[];
}

/**
 * What the UI needs from a match, whether it runs in this tab (solo or as host) or on someone
 * else's tab (joined over the network). The UI never touches the Game directly.
 */
export interface Match {
  /** This player's seat, or null when spectating. */
  readonly human: number | null;
  readonly seats: string[];
  /** Display name per seat (empty for bots). */
  readonly names: string[];
  readonly cfg: Config;
  /** Only known when the game runs in this tab (debug "reveal ideal"). */
  readonly ideal: Recipe | null;
  /** Can this player pause / change speed? */
  readonly canControlTime: boolean;
  readonly multiplayer: boolean;
  paused: boolean;
  speed: number;
  readonly done: boolean;
  readonly renderTime: number;
  /** Advance by real elapsed seconds; returns new events for this player. */
  update(realDt: number): GameEvent[];
  /** Latest view of the game for this player. */
  obs(): Observation;
  act(action: Action): void;
  ready(): void;
  endData(): EndData | null;
  /** Called when the UI is done with the match (closes network connections). */
  dispose(): void;
}
