/**
 * Run one batch from the command line.
 *
 *   npm run sim -- --games 200 --lineup searcher,hybrid,copycat,static --set magnitude=own --set scale=25
 *
 * --set takes any Config key (see core/src/config.ts). Values are parsed as JSON when possible.
 */
import { formatBatch, runBatch } from './runner.js';

const args = process.argv.slice(2);
let games = 100;
let skill: 'superhuman' | 'human' = 'superhuman';
let lineup = ['searcher', 'hybrid', 'copycat', 'static'];
const overrides: Record<string, unknown> = {};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--games') games = Number(args[++i]);
  else if (a === '--lineup') lineup = args[++i].split(',');
  else if (a === '--skill') skill = args[++i] as typeof skill;
  else if (a === '--set') {
    const [k, ...rest] = args[++i].split('=');
    const raw = rest.join('=');
    try {
      overrides[k] = JSON.parse(raw);
    } catch {
      overrides[k] = raw;
    }
  } else {
    console.error(`Unknown argument: ${a}`);
    process.exit(1);
  }
}

const label = Object.keys(overrides).length
  ? Object.entries(overrides).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')
  : 'Default config';
console.log(formatBatch(runBatch(`${label} · ${skill} bots`, lineup, games, overrides, 1000, skill)));
