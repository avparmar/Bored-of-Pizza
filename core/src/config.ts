/**
 * Every tunable number in the game lives here. Values are first guesses from DESIGN.md.
 * Anything described "as a fraction of scale" adapts automatically when `scale` changes.
 */
export type MagnitudeMode =
  /** A: reports give direction only */
  | 'none'
  /** B: every report includes a fuzzy magnitude */
  | 'all'
  /** C: only reports about your own pizza include magnitude */
  | 'own';

export interface Config {
  seed: number;
  players: number;
  /** Sliders and the ideal run from 1 to `scale`. */
  scale: number;
  durationSec: number;
  tickSec: number;

  // --- Tips & accuracy ---
  tipBase: number;
  /** Steepness of tip = base * e^(-k * distance), distance in "1–10 units". */
  tipK: number;
  /** Each tip is multiplied by a random factor in [1 - noise, 1 + noise]. */
  tipNoise: number;

  // --- Customer share ---
  /** Number of recent pizzas averaged into a restaurant's accuracy score. */
  shareWindow: number;
  /** Share ∝ accuracy^p. Higher p = being ahead pulls more customers. */
  shareP: number;
  /**
   * Pizzas older than this are dropped from the accuracy score; a restaurant with none left
   * gets the market-average score. Prevents a "stale reputation trap" where a restaurant that
   * falls behind serves too rarely to ever update its score. Infinity = pure last-N.
   */
  shareMaxAgeSec: number;
  /** Share is divided by (1 + queuePenalty * queueLength). */
  queuePenalty: number;

  // --- Flow & timing ---
  arrivalMeanSec: number;
  serviceSec: number;
  eatSec: number;
  /** Court is courtSize x courtSize units; restaurants in the corners. */
  courtSize: number;
  customerSpeed: number;
  waiterSpeed: number;
  tableGrid: number;

  // --- Intel ---
  waitersPerPlayer: number;
  /** Waiters walk home after their diner finishes, or after a table sits empty this long. */
  waiterAutoReturn: boolean;
  waiterIdleReturnSec: number;
  /** Customers walk in from an entrance to the shop, and walk out after eating. */
  customerWalkIn: boolean;
  /** Chance each of your own customers leaves you a comment card when done eating. */
  commentCardRate: number;
  magnitude: MagnitudeMode;
  /** Off by <= this fraction of scale = "a little"; <= second = "a lot"; else "way off". */
  magnitudeBuckets: [number, number];
  startingIntel: boolean;

  // --- Ideal recipe movement ---
  /** Chance that each initial ideal value is pulled from the outer quarter of the range. */
  idealEdgeBias: number;
  driftEverySec: number;
  driftStep: number;
  trendShiftTimes: number[];
  trendShiftIngredients: number;
  /** Trend shift size range, as fraction of scale. */
  trendShiftSize: [number, number];

  // --- Cost of changing recipe ---
  /** Shop closed this many seconds per point changed. */
  retoolSecPerPoint: number;
  /** Money paid per point changed. */
  retoolCostPerPoint: number;
}

export const defaultConfig: Config = {
  seed: 1,
  players: 4,
  scale: 20,
  durationSec: 600,
  tickSec: 0.1,

  tipBase: 10,
  tipK: 0.35,
  tipNoise: 0.2,

  shareWindow: 10,
  shareP: 1,
  shareMaxAgeSec: 30,
  queuePenalty: 0.15,

  arrivalMeanSec: 1.5,
  serviceSec: 1.5,
  eatSec: 4.5,
  courtSize: 20,
  customerSpeed: 2.5,
  waiterSpeed: 3,
  tableGrid: 4,

  waitersPerPlayer: 2,
  waiterAutoReturn: true,
  waiterIdleReturnSec: 3,
  customerWalkIn: true,
  commentCardRate: 1 / 8,
  magnitude: 'none',
  magnitudeBuckets: [0.1, 0.3],
  startingIntel: true,

  idealEdgeBias: 0.3,
  driftEverySec: 20,
  driftStep: 1,
  trendShiftTimes: [150, 300, 450],
  trendShiftIngredients: 2,
  trendShiftSize: [0.2, 0.4],

  retoolSecPerPoint: 0,
  retoolCostPerPoint: 0,
};

export function makeConfig(overrides: Partial<Config> = {}): Config {
  return { ...defaultConfig, ...overrides };
}
