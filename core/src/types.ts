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
}

export type Action =
  | { type: 'setRecipe'; recipe: Recipe }
  | { type: 'assignWaiter'; idx: number; table: number | null };
