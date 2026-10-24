import type { Config } from './config.js';
import type { Direction, Magnitude, Recipe } from './types.js';

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function clampRecipe(r: readonly number[], scale: number): Recipe {
  return r.map((v) => clamp(Math.round(v), 1, scale)) as Recipe;
}

/** Sum of absolute differences, in raw slider points. */
export function rawDistance(a: Recipe, b: Recipe): number {
  return a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0);
}

/** Distance normalized to "1–10 units" so the tip curve is independent of scale. */
export function distance(a: Recipe, b: Recipe, cfg: Config): number {
  return rawDistance(a, b) / (cfg.scale / 10);
}

/** 0..1, where 1 is a perfect match. Used for customer share. */
export function accuracy(recipe: Recipe, ideal: Recipe, cfg: Config): number {
  return Math.exp(-cfg.tipK * distance(recipe, ideal, cfg));
}

export function directionOf(value: number, ideal: number): Direction {
  if (ideal > value) return 'higher';
  if (ideal < value) return 'lower';
  return 'right';
}

export function magnitudeOf(value: number, ideal: number, cfg: Config): Magnitude {
  const off = Math.abs(ideal - value);
  const [a, b] = cfg.magnitudeBuckets.map((f) => Math.max(1, Math.round(f * cfg.scale)));
  if (off <= a) return 'little';
  if (off <= b) return 'lot';
  return 'way';
}

/** The interval of ideal values consistent with a report, given its served value. */
export function intervalFromReport(
  value: number,
  direction: Direction,
  magnitude: Magnitude | null,
  cfg: Config,
): [number, number] {
  const [a, b] = cfg.magnitudeBuckets.map((f) => Math.max(1, Math.round(f * cfg.scale)));
  if (direction === 'right') return [value, value];
  let near = 1;
  let far = cfg.scale;
  if (magnitude === 'little') [near, far] = [1, a];
  else if (magnitude === 'lot') [near, far] = [a + 1, b];
  else if (magnitude === 'way') [near, far] = [b + 1, cfg.scale];
  const lo = direction === 'higher' ? value + near : value - far;
  const hi = direction === 'higher' ? value + far : value - near;
  return [clamp(lo, 1, cfg.scale), clamp(hi, 1, cfg.scale)];
}
