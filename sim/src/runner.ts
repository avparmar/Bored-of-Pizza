import { distance, Game, makeConfig, Rng, type Config } from '@bop/core';
import { STRATEGIES } from './bots/strategies.js';

export interface PlayerResult {
  strategy: string;
  money: number;
  /** 1 = winner. */
  rank: number;
  served: number;
  /** First time within distance 2 (1–10 units) of the ideal, or null. */
  timeToClose: number | null;
  timeToExact: number | null;
  /** Average distance from the ideal over the game (1–10 units). */
  meanDist: number;
  reportsOwn: number;
  reportsRival: number;
  recipeChanges: number;
}

export interface GameResult {
  players: PlayerResult[];
  /** (max - min) / mean of final money. */
  spread: number;
  /** Did the money leader at 2:00 win? */
  earlyLeaderWon: boolean;
  leadChanges: number;
  /** Per trend shift: seconds until someone is close again (null = never before next shift/end). */
  recoveries: (number | null)[];
  /** Average |ideal change| on the reported ingredient between order and delivery (raw points). */
  staleness: number;
  /** Fraction of reports whose direction was already wrong when delivered. */
  staleDirectionRate: number;
  reportDelay: number;
  takeouts: number;
}

const CLOSE = 2;
const DECIDE_EVERY = 1;

export function runGame(cfg: Config, lineup: string[]): GameResult {
  const game = new Game(cfg);
  const botRng = new Rng(cfg.seed * 7919 + 1);
  const bots = lineup.map((name, i) => {
    const f = STRATEGIES[name];
    if (!f) throw new Error(`Unknown strategy "${name}". Options: ${Object.keys(STRATEGIES).join(', ')}`);
    return f(i, botRng);
  });

  let nextDecision = 0;
  while (!game.done) {
    if (game.t >= nextDecision - 1e-9) {
      for (let p = 0; p < bots.length; p++) {
        for (const a of bots[p].decide(game.observe(p))) game.act(p, a);
      }
      nextDecision += DECIDE_EVERY;
    }
    game.step();
  }

  const snaps = game.snapshots;
  const n = lineup.length;

  const players: PlayerResult[] = lineup.map((strategy, p) => {
    let close: number | null = null;
    let exact: number | null = null;
    let sum = 0;
    for (const s of snaps) {
      const d = distance(s.recipes[p], s.ideal, cfg);
      sum += d;
      if (close === null && d <= CLOSE) close = s.t;
      if (exact === null && d === 0) exact = s.t;
    }
    const mine = game.reportLog.filter((r) => r.to === p);
    return {
      strategy,
      money: game.money[p],
      rank: 0,
      served: game.served[p],
      timeToClose: close,
      timeToExact: exact,
      meanDist: sum / snaps.length,
      reportsOwn: mine.filter((r) => r.about === p).length,
      reportsRival: mine.filter((r) => r.about !== p).length,
      recipeChanges: game.recipeChanges[p],
    };
  });
  const order = [...players].sort((a, b) => b.money - a.money);
  order.forEach((pl, i) => (pl.rank = i + 1));

  const money = players.map((p) => p.money);
  const mean = money.reduce((a, b) => a + b, 0) / n;
  const spread = mean > 0 ? (Math.max(...money) - Math.min(...money)) / mean : 0;

  const leaderAt = (t: number) => {
    const s = snaps.find((x) => x.t >= t) ?? snaps[snaps.length - 1];
    return s.money.indexOf(Math.max(...s.money));
  };
  const winner = money.indexOf(Math.max(...money));

  let leadChanges = 0;
  let prev = -1;
  for (const s of snaps) {
    if (s.t < 30) continue;
    const l = s.money.indexOf(Math.max(...s.money));
    if (prev >= 0 && l !== prev) leadChanges++;
    prev = l;
  }

  const recoveries = game.shiftTimes.map((t0, k) => {
    const end = game.shiftTimes[k + 1] ?? cfg.durationSec;
    for (const s of snaps) {
      if (s.t <= t0 || s.t >= end) continue;
      if (s.recipes.some((r) => distance(r, s.ideal, cfg) <= CLOSE)) return s.t - t0;
    }
    return null;
  });

  const log = game.reportLog;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return {
    players,
    spread,
    earlyLeaderWon: leaderAt(120) === winner,
    leadChanges,
    recoveries,
    staleness: avg(log.map((r) => Math.abs(r.idealAtDelivery - r.idealAtOrder))),
    staleDirectionRate: avg(log.map((r) => (r.staleDirection ? 1 : 0))),
    reportDelay: avg(log.map((r) => r.deliveredAt - r.orderedAt)),
    takeouts: game.takeouts,
  };
}

export interface StrategySummary {
  strategy: string;
  seats: number;
  winRate: number;
  meanRank: number;
  meanMoney: number;
  meanDist: number;
  closeRate: number;
  timeToClose: number | null;
  exactRate: number;
  reportsOwn: number;
  reportsRival: number;
  recipeChanges: number;
  shareOfCustomers: number;
}

export interface BatchSummary {
  label: string;
  games: number;
  lineup: string[];
  strategies: StrategySummary[];
  spread: number;
  earlyLeaderWon: number;
  leadChanges: number;
  recoveryRate: number;
  recoveryTime: number | null;
  staleness: number;
  staleDirectionRate: number;
  reportDelay: number;
  takeoutsPerGame: number;
}

/** Runs `games` games, rotating seats each game so no strategy is stuck with one corner. */
export function runBatch(
  label: string,
  lineup: string[],
  games: number,
  overrides: Partial<Config> = {},
  baseSeed = 1000,
): BatchSummary {
  const results: GameResult[] = [];
  for (let g = 0; g < games; g++) {
    const rot = g % lineup.length;
    const seats = [...lineup.slice(rot), ...lineup.slice(0, rot)];
    results.push(runGame(makeConfig({ ...overrides, seed: baseSeed + g }), seats));
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const all = results.flatMap((r) => r.players);
  const totalServed = (r: GameResult) => r.players.reduce((a, p) => a + p.served, 0);

  const strategies = [...new Set(lineup)].map((strategy) => {
    const ps = all.filter((p) => p.strategy === strategy);
    const shares = results.flatMap((r) =>
      r.players.filter((p) => p.strategy === strategy).map((p) => p.served / totalServed(r)),
    );
    const closes = ps.filter((p) => p.timeToClose !== null).map((p) => p.timeToClose!);
    return {
      strategy,
      seats: ps.length,
      winRate: ps.filter((p) => p.rank === 1).length / ps.length,
      meanRank: avg(ps.map((p) => p.rank)),
      meanMoney: avg(ps.map((p) => p.money)),
      meanDist: avg(ps.map((p) => p.meanDist)),
      closeRate: closes.length / ps.length,
      timeToClose: closes.length ? avg(closes) : null,
      exactRate: ps.filter((p) => p.timeToExact !== null).length / ps.length,
      reportsOwn: avg(ps.map((p) => p.reportsOwn)),
      reportsRival: avg(ps.map((p) => p.reportsRival)),
      recipeChanges: avg(ps.map((p) => p.recipeChanges)),
      shareOfCustomers: avg(shares),
    };
  });

  const recs = results.flatMap((r) => r.recoveries);
  const recovered = recs.filter((x): x is number => x !== null);

  return {
    label,
    games,
    lineup,
    strategies,
    spread: avg(results.map((r) => r.spread)),
    earlyLeaderWon: avg(results.map((r) => (r.earlyLeaderWon ? 1 : 0))),
    leadChanges: avg(results.map((r) => r.leadChanges)),
    recoveryRate: recs.length ? recovered.length / recs.length : 0,
    recoveryTime: recovered.length ? avg(recovered) : null,
    staleness: avg(results.map((r) => r.staleness)),
    staleDirectionRate: avg(results.map((r) => r.staleDirectionRate)),
    reportDelay: avg(results.map((r) => r.reportDelay)),
    takeoutsPerGame: avg(results.map((r) => r.takeouts)),
  };
}

// ------------------------------------------------------------------ formatting

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number | null, d = 1) => (x === null ? '—' : x.toFixed(d));

export function formatBatch(b: BatchSummary): string {
  const lines: string[] = [];
  lines.push(`### ${b.label}`);
  lines.push('');
  lines.push(`Lineup: ${b.lineup.join(', ')} · ${b.games} games, seats rotated`);
  lines.push('');
  lines.push(
    '| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |',
  );
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of b.strategies) {
    lines.push(
      `| ${s.strategy} | ${pct(s.winRate)} | ${num(s.meanRank, 2)} | ${num(s.meanMoney, 0)} | ${pct(
        s.shareOfCustomers,
      )} | ${num(s.meanDist)} | ${pct(s.closeRate)} | ${s.timeToClose === null ? '—' : num(s.timeToClose, 0) + 's'} | ${pct(
        s.exactRate,
      )} | ${num(s.reportsOwn, 0)} / ${num(s.reportsRival, 0)} | ${num(s.recipeChanges, 0)} |`,
    );
  }
  lines.push('');
  lines.push(
    `Money spread ${num(b.spread, 2)} · leader at 2:00 wins ${pct(b.earlyLeaderWon)} · ` +
      `lead changes ${num(b.leadChanges)} · trend shifts recovered ${pct(b.recoveryRate)} ` +
      `(avg ${b.recoveryTime === null ? '—' : num(b.recoveryTime, 0) + 's'}) · ` +
      `report delay ${num(b.reportDelay)}s · ideal moved ${num(b.staleness, 2)} pts by delivery · ` +
      `direction already wrong ${pct(b.staleDirectionRate)} · takeouts/game ${num(b.takeoutsPerGame)}`,
  );
  lines.push('');
  return lines.join('\n');
}
