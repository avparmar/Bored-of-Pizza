/**
 * Experiment suites from DESIGN.md §10. Each writes sim/results/<suite>.md.
 *
 *   npm run experiments -- round2        (200 games per batch)
 *   npm run experiments -- round2 50     (quicker)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig, type Config } from '@bop/core';
import { formatBatch, reachAfterSitDown, runBatch } from './runner.js';
import type { BotSkill } from './bots/strategies.js';

interface Experiment {
  /** Settings pinned for every batch in this experiment (so old suites stay reproducible). */
  base?: Partial<Config>;
  title: string;
  question: string;
  batches: { label: string; lineup: string[]; overrides?: Partial<Config>; skill?: BotSkill }[];
  note?: () => string;
}

// ------------------------------------------------------------------ round 1

/** Round 1 ran before these were changed; pin them so the suite stays reproducible. */
const R1: Partial<Config> = {
  shareP: 2,
  eatSec: 7,
  customerWalkIn: false,
  waiterAutoReturn: false,
  pregameSec: 0,
  headlineNames: 'one',
  reportBag: false,
};
const MIXED = ['searcher', 'hybrid', 'copycat', 'static'];

const round1: Experiment[] = [
  {
    title: '1. Baseline',
    question: 'With default settings, how do the simple strategies compare?',
    batches: [{ label: 'Default config', lineup: MIXED, overrides: R1 }],
  },
  {
    title: '2. Is copying too cheap?',
    question:
      'One copycat among three players who gather intel. Does the free rider beat the people doing the work, and how much does a retooling cost change that?',
    batches: [
      { label: 'No change cost', lineup: ['searcher', 'searcher', 'searcher', 'copycat'], overrides: R1 },
      {
        label: 'Retool 0.5s per point',
        lineup: ['searcher', 'searcher', 'searcher', 'copycat'],
        overrides: { ...R1, retoolSecPerPoint: 0.5 },
      },
      {
        label: 'Retool 1s per point',
        lineup: ['searcher', 'searcher', 'searcher', 'copycat'],
        overrides: { ...R1, retoolSecPerPoint: 1 },
      },
      { label: 'vs hybrids, no change cost', lineup: ['hybrid', 'hybrid', 'hybrid', 'copycat'], overrides: R1 },
      {
        label: 'vs hybrids, retool 1s per point',
        lineup: ['hybrid', 'hybrid', 'hybrid', 'copycat'],
        overrides: { ...R1, retoolSecPerPoint: 1 },
      },
    ],
  },
  {
    title: '3. Magnitude variants (DESIGN.md §6)',
    question: 'A = direction only, B = magnitude on every report, C = magnitude only on your own pizza.',
    batches: (['none', 'all', 'own'] as const).map((m, i) => ({
      label: `${'ABC'[i]}: magnitude=${m}`,
      lineup: ['searcher', 'hybrid', 'hawk', 'hybrid'],
      overrides: { ...R1, magnitude: m },
    })),
  },
  {
    title: '4. Slider scale',
    question: 'How does the range affect how fast intel-gathering players converge? (4 hybrids)',
    batches: [10, 20, 25].map((scale) => ({
      label: `scale 1–${scale}`,
      lineup: ['hybrid', 'hybrid', 'hybrid', 'hybrid'],
      overrides: { ...R1, scale },
    })),
  },
  {
    title: '5. Customer-share sharpness',
    question:
      'How strongly should accuracy pull customers? p is the exponent; "no max age" is pure last-N pizzas (the stale-reputation trap).',
    batches: [
      { label: 'p=1', lineup: MIXED, overrides: { ...R1, shareP: 1 } },
      { label: 'p=2', lineup: MIXED, overrides: { ...R1, shareP: 2 } },
      { label: 'p=4', lineup: MIXED, overrides: { ...R1, shareP: 4 } },
      { label: 'p=4, no max age', lineup: MIXED, overrides: { ...R1, shareP: 4, shareMaxAgeSec: Infinity } },
    ],
  },
  {
    title: '6. Eating time vs report staleness',
    question: 'Reports are delayed by walk + eat time. How stale are they, and does it matter? (4 hybrids)',
    batches: [4, 7, 10].map((eatSec) => ({
      label: `eat ${eatSec}s`,
      lineup: ['hybrid', 'hybrid', 'hybrid', 'hybrid'],
      overrides: { ...R1, eatSec },
    })),
  },
  {
    title: '7. Drift speed vs intel rate',
    question:
      'Does the ideal drift faster than players can learn it? Drift = one random ingredient ±1 every N seconds. (searcher, hybrid, hawk, hybrid)',
    batches: [
      ...[5, 10, 20].map((d) => ({
        label: `drift every ${d}s`,
        lineup: ['searcher', 'hybrid', 'hawk', 'hybrid'],
        overrides: { ...R1, driftEverySec: d },
      })),
      {
        label: 'no drift (trend shifts only)',
        lineup: ['searcher', 'hybrid', 'hawk', 'hybrid'],
        overrides: { ...R1, driftEverySec: 1e9 },
      },
    ],
  },
];

// ------------------------------------------------------------------ round 2

const SMART = ['analyst', 'hybrid', 'hawk', 'searcher'];
/**
 * Round 2 ran before customers walked in and waiters walked home; this pins those off.
 * Customers now also leave from the shop door rather than its centre, so reruns differ slightly
 * from the committed round2.md (reports arrive ~2s sooner).
 */
const R2: Partial<Config> = {
  customerWalkIn: false,
  waiterAutoReturn: false,
  pregameSec: 0,
  headlineNames: 'one',
  reportBag: false,
};

const round2: Experiment[] = [
  {
    title: '1. New baseline',
    question: 'Signed-off defaults (p=1, eat 4.5s, drift every 20s, no retool cost), with the new analyst bot.',
    batches: [{ label: 'Default config', lineup: SMART, overrides: R2 }],
  },
  {
    title: '2. Doing the math on public money',
    question:
      "The analyst estimates each shop's accuracy from its tip per pizza (public money ÷ customers served). Does that beat intel alone, and does tip noise blunt it?",
    batches: [0, 0.2, 0.4].map((tipNoise) => ({
      label: `tip noise ±${Math.round(tipNoise * 100)}%`,
      lineup: ['analyst', 'hybrid', 'hybrid', 'hybrid'],
      overrides: { ...R2, tipNoise },
    })),
  },
  {
    title: '3. Magnitude variants, smarter bots',
    question: 'A = direction only, B = magnitude on every report, C = magnitude only on your own pizza.',
    batches: (['none', 'all', 'own'] as const).map((m, i) => ({
      label: `${'ABC'[i]}: magnitude=${m}`,
      lineup: ['analyst', 'hybrid', 'hawk', 'analyst'],
      overrides: { ...R2, magnitude: m },
    })),
  },
  {
    title: '4. Waiter speed',
    question:
      'With 4.5s eating, can waiters get there in time? "Diners watched" = share of seated diners with a waiter at their table when they finished.',
    batches: [2, 3, 4].map((waiterSpeed) => ({
      label: `waiter speed ${waiterSpeed}`,
      lineup: ['analyst', 'hybrid', 'hawk', 'hybrid'],
      overrides: { ...R2, waiterSpeed },
    })),
    note: () => {
      const rows = [2, 3, 4].map((ws) => {
        const r = reachAfterSitDown({ waiterSpeed: ws });
        return `| ${ws} | ${Math.round(r.fromCorner * 100)}% | ${Math.round(r.fromCenter * 100)}% |`;
      });
      return [
        'Tables a waiter can reach within one eating time if it only starts walking once the diner sits down:',
        '',
        '| Waiter speed | From its restaurant corner | From mid-court |',
        '|---|---|---|',
        ...rows,
        '',
      ].join('\n');
    },
  },
  {
    title: '5. Is copying still too cheap?',
    question: 'Copycat among intel gatherers, under the new defaults.',
    batches: [
      { label: 'vs searchers', lineup: ['searcher', 'searcher', 'searcher', 'copycat'], overrides: R2 },
      { label: 'vs hybrids', lineup: ['hybrid', 'hybrid', 'hybrid', 'copycat'], overrides: R2 },
      { label: 'vs analysts', lineup: ['analyst', 'analyst', 'analyst', 'copycat'], overrides: R2 },
    ],
  },
  {
    title: '6. p=1 vs p=2, smarter bots',
    question: 'Confirms the p=1 decision with the new lineup.',
    batches: [1, 2].map((shareP) => ({ label: `p=${shareP}`, lineup: SMART, overrides: { ...R2, shareP } })),
  },
];

// ------------------------------------------------------------------ round 3

const R3_LINEUP = ['analyst', 'hybrid', 'hawk', 'hybrid'];
const H: BotSkill = 'human';

const round3: Experiment[] = [
  {
    title: '1. Human-like bots vs superhuman bots',
    question:
      'Human-like bots look every 2s, react 0.8–2s late and send at most one waiter per look. How much does that change intel and outcomes?',
    batches: [
      { label: 'superhuman', lineup: R3_LINEUP, skill: 'superhuman' },
      { label: 'human-like', lineup: R3_LINEUP, skill: H },
    ],
  },
  {
    title: '2. Gentler trend shifts',
    question:
      'Default: 2 ingredients jump 4–8 points instantly. "Income gap after shifts" = (best − worst) / average income in the 60s after a shift; compare with a typical minute.',
    batches: [
      { label: 'instant (current)', lineup: R3_LINEUP, skill: H },
      { label: 'gradual over 20s', lineup: R3_LINEUP, skill: H, overrides: { trendShiftRampSec: 20 } },
      { label: 'gradual over 40s', lineup: R3_LINEUP, skill: H, overrides: { trendShiftRampSec: 40 } },
      { label: '1 ingredient, instant', lineup: R3_LINEUP, skill: H, overrides: { trendShiftIngredients: 1 } },
      { label: 'smaller (2–5 points), instant', lineup: R3_LINEUP, skill: H, overrides: { trendShiftSize: [0.1, 0.25] } },
    ],
  },
  {
    title: '3. Lighter penalty for being wrong',
    question:
      'tipK sets how fast tips (and accuracy) fall with distance. Share floor/cap keep every shop between 10% and 45% of customers.',
    batches: [
      { label: 'k=0.35 (current)', lineup: R3_LINEUP, skill: H },
      { label: 'k=0.25', lineup: R3_LINEUP, skill: H, overrides: { tipK: 0.25 } },
      { label: 'k=0.18', lineup: R3_LINEUP, skill: H, overrides: { tipK: 0.18 } },
      { label: 'share 10–45%', lineup: R3_LINEUP, skill: H, overrides: { shareFloor: 0.1, shareCap: 0.45 } },
      {
        label: 'k=0.25 + share 10–45%',
        lineup: R3_LINEUP,
        skill: H,
        overrides: { tipK: 0.25, shareFloor: 0.1, shareCap: 0.45 },
      },
    ],
  },
  {
    title: '4. Combined',
    question: 'Gradual 20s shifts together with a lighter penalty.',
    batches: [
      {
        label: 'gradual 20s + share 10–45%',
        lineup: R3_LINEUP,
        skill: H,
        overrides: { trendShiftRampSec: 20, shareFloor: 0.1, shareCap: 0.45 },
      },
      {
        label: 'gradual 20s + k=0.25 + share 10–45%',
        lineup: R3_LINEUP,
        skill: H,
        overrides: { trendShiftRampSec: 20, tipK: 0.25, shareFloor: 0.1, shareCap: 0.45 },
      },
    ],
  },
];

/** Round 3 ran before the flow changes in round 4. */
const R3: Partial<Config> = {
  eatSec: 4.5,
  arrivalMeanSec: 1.5,
  waiterSpeed: 3,
  shareFloor: 0,
  headlineNames: 'one',
  reportBag: false,
};
for (const e of round3) e.base = R3;

// ------------------------------------------------------------------ round 4

const round4: Experiment[] = [
  {
    title: '1. Faster flow',
    question:
      'Old flow (eat 4.5s, a customer every 1.5s, waiter speed 3, no floor) vs new defaults (eat 6s, every 1.2s, waiter speed 4, 10% floor).',
    batches: [
      { label: 'old flow', lineup: R3_LINEUP, skill: H, overrides: R3 },
      { label: 'new flow (defaults)', lineup: R3_LINEUP, skill: H },
      { label: 'new flow, superhuman bots', lineup: R3_LINEUP, skill: 'superhuman' },
    ],
  },
  {
    title: '2. Gentler tips on the new flow',
    question: 'Does k=0.25 still narrow the spread with the new flow?',
    batches: [
      { label: 'k=0.35 (current)', lineup: R3_LINEUP, skill: H },
      { label: 'k=0.25', lineup: R3_LINEUP, skill: H, overrides: { tipK: 0.25 } },
    ],
  },
];

// ------------------------------------------------------------------ main

const SUITES: Record<string, { title: string; experiments: Experiment[] }> = {
  round1: { title: 'Round 1: simple bots', experiments: round1 },
  round2: { title: 'Round 2: signed-off defaults and a smarter bot', experiments: round2 },
  round3: { title: 'Round 3: human-like bots, trend shifts vs penalty', experiments: round3 },
  round4: { title: 'Round 4: faster flow', experiments: round4 },
};

const suiteName = process.argv[2] ?? 'round4';
const GAMES = Number(process.argv[3] ?? 200);
const suite = SUITES[suiteName];
if (!suite) {
  console.error(`Unknown suite "${suiteName}". Options: ${Object.keys(SUITES).join(', ')}`);
  process.exit(1);
}

const out: string[] = [];
out.push(`# Simulation results: ${suite.title}`);
out.push('');
out.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${GAMES} games per batch.`);
out.push('');
out.push('**Columns:** distances are in "1–10 units" (raw slider points ÷ (scale/10)), summed over 4');
out.push('ingredients. "Got close" = reached distance ≤ 2 at some point. "Ever exact" = matched the ideal');
out.push('exactly at some point. Customer share = fraction of all customers served.');
out.push('');
out.push('<details><summary>Default config for this run</summary>');
out.push('');
out.push('```json');
out.push(JSON.stringify(defaultConfig, null, 2));
out.push('```');
out.push('</details>');
out.push('');

for (const e of suite.experiments) {
  out.push(`## ${e.title}`);
  out.push('');
  out.push(`_${e.question}_`);
  out.push('');
  if (e.note) out.push(e.note());
  for (const b of e.batches) {
    const label = b.skill ? `${b.label} · ${b.skill} bots` : b.label;
    const overrides = { ...(e.base ?? {}), ...(b.overrides ?? {}) };
    out.push(formatBatch(runBatch(label, b.lineup, GAMES, overrides, 1000, b.skill)));
    process.stderr.write(`done: ${e.title} / ${b.label}\n`);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'results', `${suiteName}.md`);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, out.join('\n'));
console.log(`Wrote ${file}`);
