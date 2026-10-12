/**
 * The experiment suite from DESIGN.md §10. Writes sim/results/experiments.md.
 *
 *   npm run experiments            (200 games per batch)
 *   npm run experiments -- 50      (quicker)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig, type Config } from '@bop/core';
import { formatBatch, runBatch } from './runner.js';

const GAMES = Number(process.argv[2] ?? 200);

interface Experiment {
  title: string;
  question: string;
  batches: { label: string; lineup: string[]; overrides?: Partial<Config> }[];
}

const MIXED = ['searcher', 'hybrid', 'copycat', 'static'];

const experiments: Experiment[] = [
  {
    title: '1. Baseline',
    question: 'With default settings, how do the simple strategies compare?',
    batches: [{ label: 'Default config', lineup: MIXED }],
  },
  {
    title: '2. Is copying too cheap?',
    question:
      'One copycat among three players who gather intel. Does the free rider beat the people doing the work, and how much does a retooling cost change that?',
    batches: [
      { label: 'No change cost', lineup: ['searcher', 'searcher', 'searcher', 'copycat'] },
      {
        label: 'Retool 0.5s per point',
        lineup: ['searcher', 'searcher', 'searcher', 'copycat'],
        overrides: { retoolSecPerPoint: 0.5 },
      },
      {
        label: 'Retool 1s per point',
        lineup: ['searcher', 'searcher', 'searcher', 'copycat'],
        overrides: { retoolSecPerPoint: 1 },
      },
      { label: 'vs hybrids, no change cost', lineup: ['hybrid', 'hybrid', 'hybrid', 'copycat'] },
      {
        label: 'vs hybrids, retool 1s per point',
        lineup: ['hybrid', 'hybrid', 'hybrid', 'copycat'],
        overrides: { retoolSecPerPoint: 1 },
      },
    ],
  },
  {
    title: '3. Magnitude variants (DESIGN.md §6)',
    question: 'A = direction only, B = magnitude on every report, C = magnitude only on your own pizza.',
    batches: (['none', 'all', 'own'] as const).map((m, i) => ({
      label: `${'ABC'[i]}: magnitude=${m}`,
      lineup: ['searcher', 'hybrid', 'hawk', 'hybrid'],
      overrides: { magnitude: m },
    })),
  },
  {
    title: '4. Slider scale',
    question: 'How does the range affect how fast intel-gathering players converge? (4 hybrids)',
    batches: [10, 20, 25].map((scale) => ({
      label: `scale 1–${scale}`,
      lineup: ['hybrid', 'hybrid', 'hybrid', 'hybrid'],
      overrides: { scale },
    })),
  },
  {
    title: '5. Customer-share sharpness',
    question:
      'How strongly should accuracy pull customers? p is the exponent; "no max age" is pure last-N pizzas (the stale-reputation trap).',
    batches: [
      { label: 'p=1', lineup: MIXED, overrides: { shareP: 1 } },
      { label: 'p=2 (default)', lineup: MIXED, overrides: { shareP: 2 } },
      { label: 'p=4', lineup: MIXED, overrides: { shareP: 4 } },
      { label: 'p=4, no max age', lineup: MIXED, overrides: { shareP: 4, shareMaxAgeSec: Infinity } },
    ],
  },
  {
    title: '6. Eating time vs report staleness',
    question: 'Reports are delayed by walk + eat time. How stale are they, and does it matter? (4 hybrids)',
    batches: [4, 7, 10].map((eatSec) => ({
      label: `eat ${eatSec}s`,
      lineup: ['hybrid', 'hybrid', 'hybrid', 'hybrid'],
      overrides: { eatSec },
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
        overrides: { driftEverySec: d },
      })),
      {
        label: 'no drift (trend shifts only)',
        lineup: ['searcher', 'hybrid', 'hawk', 'hybrid'],
        overrides: { driftEverySec: 1e9 },
      },
    ],
  },
];

const out: string[] = [];
out.push('# Simulation results');
out.push('');
out.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${GAMES} games per batch.`);
out.push('');
out.push('**Columns:** distances are in "1–10 units" (raw slider points ÷ (scale/10)), summed over 4');
out.push('ingredients. "Got close" = reached distance ≤ 2 at some point. "Ever exact" = matched the ideal');
out.push('exactly at some point. Customer share = fraction of all customers served.');
out.push('');
out.push('<details><summary>Default config</summary>');
out.push('');
out.push('```json');
out.push(JSON.stringify(defaultConfig, null, 2));
out.push('```');
out.push('</details>');
out.push('');

for (const e of experiments) {
  out.push(`## ${e.title}`);
  out.push('');
  out.push(`_${e.question}_`);
  out.push('');
  for (const b of e.batches) {
    const summary = runBatch(b.label, b.lineup, GAMES, b.overrides ?? {});
    out.push(formatBatch(summary));
    process.stderr.write(`done: ${e.title} / ${b.label}\n`);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'results', 'experiments.md');
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, out.join('\n'));
console.log(`Wrote ${file}`);
