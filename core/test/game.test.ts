import { describe, expect, it } from 'vitest';
import { Game, intervalFromReport, makeConfig, type Recipe } from '../src/index.js';

function runIdle(seed: number, overrides = {}) {
  const g = new Game(makeConfig({ seed, ...overrides }));
  while (!g.done) g.step();
  return g;
}

describe('Game', () => {
  it('is deterministic for a given seed', () => {
    const a = runIdle(42);
    const b = runIdle(42);
    expect(a.money).toEqual(b.money);
    expect(a.reportLog.length).toEqual(b.reportLog.length);
  });

  it('splits customers roughly evenly when all recipes are identical', () => {
    const served = [0, 0, 0, 0];
    for (let seed = 1; seed <= 8; seed++) {
      const g = runIdle(seed);
      g.served.forEach((s, i) => (served[i] += s));
    }
    const total = served.reduce((a, b) => a + b, 0);
    expect(total / 8).toBeGreaterThan(300);
    for (const s of served) expect(s / total).toBeGreaterThan(0.22);
  });

  it('rewards a restaurant that matches the ideal', () => {
    const g = new Game(makeConfig({ seed: 3, driftEverySec: 1e9, trendShiftTimes: [] }));
    g.act(0, { type: 'setRecipe', recipe: [...g.ideal] as Recipe });
    while (!g.done) g.step();
    expect(g.money[0]).toBeGreaterThan(Math.max(...g.money.slice(1)) * 2);
    const total = g.served.reduce((a, b) => a + b, 0);
    expect(g.served[0] / total).toBeGreaterThan(0.4);
  });

  it('reports directions that are correct at order time', () => {
    const g = runIdle(11);
    expect(g.reportLog.length).toBeGreaterThan(0);
    for (const r of g.reportLog) {
      const v = r.recipe[r.ingredient];
      const expected = r.idealAtOrder > v ? 'higher' : r.idealAtOrder < v ? 'lower' : 'right';
      expect(r.direction).toBe(expected);
    }
  });

  it('only shows magnitude on own pizza in "own" mode', () => {
    const g = new Game(makeConfig({ seed: 5, magnitude: 'own', waiterAutoReturn: false }));
    // Park player 0's waiters across the court so they catch rival customers.
    g.act(0, { type: 'assignWaiter', idx: 0, table: 15 });
    g.act(0, { type: 'assignWaiter', idx: 1, table: 12 });
    while (!g.done) g.step();
    const mine = g.reportLog.filter((r) => r.to === 0);
    expect(mine.some((r) => r.about !== 0)).toBe(true);
    for (const r of g.reportLog) {
      if (r.about !== r.to) expect(r.magnitude).toBeNull();
      else if (r.direction !== 'right') expect(r.magnitude).not.toBeNull();
    }
  });

  it('closes the shop while retooling', () => {
    const g = new Game(makeConfig({ seed: 9, retoolSecPerPoint: 2 }));
    g.act(0, { type: 'setRecipe', recipe: [1, 1, 1, 1] });
    // Starts at 11 on every slider (middle of 1–20): 4 sliders x 10 points x 2s.
    expect(g.closedUntil[0]).toBe(80);
  });
});

describe('Walking and waiters', () => {
  it('customers walk in from an entrance before joining the queue', () => {
    const g = new Game(makeConfig({ seed: 2 }));
    while (g.t < 3) g.step();
    const obs = g.observe(0);
    expect(obs.customers.some((c) => c.state === 'entering')).toBe(true);
    for (const c of obs.customers.filter((c) => c.state === 'entering')) {
      expect(obs.entrances).toContainEqual(c.from);
    }
  });

  it('sendWaiter dispatches a free waiter, and it walks home after the table empties', () => {
    const g = new Game(makeConfig({ seed: 4 }));
    g.act(0, { type: 'sendWaiter', table: 5 });
    let obs = g.observe(0);
    const out = obs.waiters.filter((w) => w.owner === 0 && w.state === 'out');
    expect(out.length).toBe(1);
    expect(out[0].target).toBe(5);
    // Sending to the same table again does nothing.
    g.act(0, { type: 'sendWaiter', table: 5 });
    expect(g.observe(0).waiters.filter((w) => w.owner === 0 && w.state === 'out').length).toBe(1);
    // Eventually it comes back home.
    while (g.t < 60) g.step();
    obs = g.observe(0);
    expect(obs.waiters.filter((w) => w.owner === 0).every((w) => w.state !== 'out')).toBe(true);
  });

  it('emits private tip events only to the shop owner', () => {
    const g = new Game(makeConfig({ seed: 6 }));
    while (g.t < 60) g.step();
    for (let p = 0; p < 4; p++) {
      const tips = g.drainEvents(p).filter((e) => e.type === 'tip');
      expect(tips.length).toBeGreaterThan(0);
      for (const e of tips) if (e.type === 'tip') expect(e.restaurant).toBe(p);
    }
  });
});

describe('intervalFromReport', () => {
  const cfg = makeConfig({ scale: 20 });
  it('direction only', () => {
    expect(intervalFromReport(8, 'higher', null, cfg)).toEqual([9, 20]);
    expect(intervalFromReport(8, 'lower', null, cfg)).toEqual([1, 7]);
    expect(intervalFromReport(8, 'right', null, cfg)).toEqual([8, 8]);
  });
  it('with magnitude', () => {
    expect(intervalFromReport(8, 'higher', 'little', cfg)).toEqual([9, 10]);
    expect(intervalFromReport(8, 'higher', 'lot', cfg)).toEqual([11, 14]);
    expect(intervalFromReport(8, 'higher', 'way', cfg)).toEqual([15, 20]);
    expect(intervalFromReport(8, 'lower', 'way', cfg)).toEqual([1, 1]);
  });
});
