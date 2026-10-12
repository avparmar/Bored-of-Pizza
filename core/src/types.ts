import type { Config } from './config.js';

/** [dough, sauce, cheese, toppings], each an integer 1..scale. */
export type Recipe = [number, number, number, number];

export const INGREDIENTS = ['dough', 'sauce', 'cheese', 'toppings'] as const;

export interface Vec {
  x: number;
  y: number;
}

export type Direction = 'higher' | 'lower' | 'right';
export type Magnitude = 'little' | 'lot' | 'way';

/** A piece of private intel delivered to one player. */
export interface Report {
  id: number;
  /** Player who receives it. */
  to: number;
  /** Restaurant whose pizza this is about. */
  about: number;
  /** The recipe the customer ate (as served). */
  recipe: Recipe;
  ingredient: number;
  direction: Direction;
  magnitude: Magnitude | null;
  orderedAt: number;
  deliveredAt: number;
  source: 'waiter' | 'card';
}

export interface Headline {
  t: number;
  /** One of the ingredients that just shifted (no direction given). */
  ingredient: number;
}

export interface TableView {
  id: number;
  pos: Vec;
  /** Customer heading to or sitting at this table (visible to everyone). */
  customer: { restaurant: number; seated: boolean; arriveAt: number; finishAt: number } | null;
  /** Waiters stationed here or walking here. */
  waiters: { owner: number; arrived: boolean }[];
}

export interface WaiterView {
  idx: number;
  pos: Vec;
  target: number | null;
  arriveAt: number;
  stationed: number | null;
}

/** A moving thing: position at time t is from→to, linearly between departAt and arriveAt. */
export interface Leg {
  from: Vec;
  to: Vec;
  departAt: number;
  arriveAt: number;
}

export type CustomerState = 'entering' | 'queued' | 'cooking' | 'walking' | 'seated' | 'leaving';

export interface CustomerView extends Leg {
  id: number;
  restaurant: number;
  state: CustomerState;
  /** Position in line (0 = next up); -1 when at the counter or not in line. */
  queueIdx: number;
  table: number | null;
  /** True once they're carrying (or have eaten) a pizza. */
  hasPizza: boolean;
}

export interface PublicWaiterView extends Leg {
  owner: number;
  idx: number;
  state: 'home' | 'out' | 'returning';
  target: number | null;
  stationed: number | null;
}

export type GameEvent =
  /** Private to the shop owner. */
  | { type: 'tip'; t: number; restaurant: number; amount: number }
  /** Private to the recipient. */
  | { type: 'report'; t: number; report: Report }
  | { type: 'headline'; t: number; ingredient: number }
  | { type: 'recipe'; t: number; restaurant: number; recipe: Recipe }
  /** Your waiter arrived at a table someone else was already holding. */
  | { type: 'blocked'; t: number; table: number };

/** Everything one player is allowed to know. Never contains the ideal recipe. */
export interface Observation {
  t: number;
  me: number;
  cfg: Config;
  recipes: Recipe[];
  money: number[];
  queues: number[];
  closedUntil: number[];
  served: number[];
  headlines: Headline[];
  /** My reports, oldest first. */
  reports: Report[];
  startingIntel: { ingredient: number; value: number } | null;
  tables: TableView[];
  myWaiters: WaiterView[];
  restaurantPos: Vec[];
  /** Where customers queue and waiters start from. */
  doorPos: Vec[];
  entrances: Vec[];
  customers: CustomerView[];
  waiters: PublicWaiterView[];
}

export type Action =
  | { type: 'setRecipe'; recipe: Recipe }
  | { type: 'assignWaiter'; idx: number; table: number | null }
  /** Send the first free waiter (home or walking back), nearest first. */
  | { type: 'sendWaiter'; table: number };
