# Simulation results: Round 2: signed-off defaults and a smarter bot

Generated 2026-10-12 18:36 UTC · 200 games per batch.

**Columns:** distances are in "1–10 units" (raw slider points ÷ (scale/10)), summed over 4
ingredients. "Got close" = reached distance ≤ 2 at some point. "Ever exact" = matched the ideal
exactly at some point. Customer share = fraction of all customers served.

<details><summary>Default config for this run</summary>

```json
{
  "seed": 1,
  "players": 4,
  "scale": 20,
  "durationSec": 600,
  "tickSec": 0.1,
  "tipBase": 10,
  "tipK": 0.35,
  "tipNoise": 0.2,
  "shareWindow": 10,
  "shareP": 1,
  "shareMaxAgeSec": 30,
  "queuePenalty": 0.15,
  "arrivalMeanSec": 1.5,
  "serviceSec": 1.5,
  "eatSec": 4.5,
  "courtSize": 20,
  "customerSpeed": 2.5,
  "waiterSpeed": 3,
  "tableGrid": 4,
  "waitersPerPlayer": 2,
  "commentCardRate": 0.125,
  "magnitude": "none",
  "magnitudeBuckets": [
    0.1,
    0.3
  ],
  "startingIntel": true,
  "idealEdgeBias": 0.3,
  "driftEverySec": 20,
  "driftStep": 1,
  "trendShiftTimes": [
    150,
    300,
    450
  ],
  "trendShiftIngredients": 2,
  "trendShiftSize": [
    0.2,
    0.4
  ],
  "retoolSecPerPoint": 0,
  "retoolCostPerPoint": 0
}
```
</details>

## 1. New baseline

_Signed-off defaults (p=1, eat 4.5s, drift every 20s, no retool cost), with the new analyst bot._

### Default config

Lineup: analyst, hybrid, hawk, searcher · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 37% | 2.02 | 432 | 27% | 3.6 | 100% | 52s | 78% | 48 / 49 | 80 |
| hybrid | 39% | 1.90 | 448 | 28% | 3.4 | 100% | 61s | 73% | 49 / 47 | 69 |
| hawk | 18% | 2.56 | 370 | 25% | 3.9 | 100% | 80s | 51% | 28 / 62 | 48 |
| searcher | 7% | 3.52 | 253 | 20% | 4.6 | 98% | 163s | 22% | 53 / 9 | 36 |

Money spread 0.80 · leader at 2:00 wins 51% · lead changes 6.5 · trend shifts recovered 100% (avg 48s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 75% · takeouts/game 0.1

## 2. Doing the math on public money

_The analyst estimates each shop's accuracy from its tip per pizza (public money ÷ customers served). Does that beat intel alone, and does tip noise blunt it?_

### tip noise ±0%

Lineup: analyst, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 22% | 2.81 | 366 | 24% | 3.7 | 100% | 63s | 71% | 41 / 45 | 73 |
| hybrid | 26% | 2.40 | 394 | 25% | 3.4 | 100% | 63s | 70% | 42 / 43 | 68 |

Money spread 0.45 · leader at 2:00 wins 50% · lead changes 8.4 · trend shifts recovered 100% (avg 46s) · report delay 10.4s · ideal moved 0.29 pts by delivery · direction already wrong 9% · diners watched by a waiter 75% · takeouts/game 0.1

### tip noise ±20%

Lineup: analyst, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 26% | 2.65 | 360 | 24% | 3.8 | 100% | 64s | 75% | 40 / 45 | 73 |
| hybrid | 25% | 2.45 | 382 | 25% | 3.5 | 100% | 64s | 70% | 42 / 43 | 69 |

Money spread 0.46 · leader at 2:00 wins 50% · lead changes 7.9 · trend shifts recovered 99% (avg 50s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 75% · takeouts/game 0.0

### tip noise ±40%

Lineup: analyst, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 22% | 2.73 | 361 | 24% | 3.8 | 100% | 65s | 76% | 41 / 45 | 73 |
| hybrid | 26% | 2.42 | 383 | 25% | 3.5 | 100% | 64s | 67% | 42 / 43 | 68 |

Money spread 0.49 · leader at 2:00 wins 47% · lead changes 8.1 · trend shifts recovered 100% (avg 48s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 75% · takeouts/game 0.0

## 3. Magnitude variants, smarter bots

_A = direction only, B = magnitude on every report, C = magnitude only on your own pizza._

### A: magnitude=none

Lineup: analyst, hybrid, hawk, analyst · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 23% | 2.57 | 385 | 25% | 3.7 | 100% | 56s | 79% | 40 / 47 | 75 |
| hybrid | 40% | 1.99 | 442 | 27% | 3.3 | 100% | 55s | 73% | 42 / 44 | 67 |
| hawk | 16% | 2.87 | 360 | 24% | 3.8 | 100% | 91s | 53% | 24 / 59 | 45 |

Money spread 0.59 · leader at 2:00 wins 49% · lead changes 6.7 · trend shifts recovered 100% (avg 46s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 9% · diners watched by a waiter 74% · takeouts/game 0.0

### B: magnitude=all

Lineup: analyst, hybrid, hawk, analyst · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 22% | 2.56 | 536 | 25% | 2.5 | 100% | 42s | 97% | 40 / 46 | 70 |
| hybrid | 37% | 2.17 | 574 | 26% | 2.3 | 100% | 41s | 99% | 41 / 45 | 64 |
| hawk | 19% | 2.72 | 517 | 24% | 2.5 | 100% | 54s | 94% | 24 / 59 | 39 |

Money spread 0.44 · leader at 2:00 wins 49% · lead changes 7.9 · trend shifts recovered 100% (avg 26s) · report delay 10.4s · ideal moved 0.27 pts by delivery · direction already wrong 10% · diners watched by a waiter 75% · takeouts/game 0.0

### C: magnitude=own

Lineup: analyst, hybrid, hawk, analyst · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 25% | 2.46 | 483 | 25% | 2.9 | 100% | 45s | 91% | 40 / 46 | 72 |
| hybrid | 45% | 1.80 | 558 | 27% | 2.6 | 100% | 45s | 94% | 43 / 44 | 63 |
| hawk | 6% | 3.29 | 382 | 22% | 3.4 | 100% | 73s | 70% | 22 / 60 | 42 |

Money spread 0.62 · leader at 2:00 wins 48% · lead changes 7.5 · trend shifts recovered 100% (avg 32s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 10% · diners watched by a waiter 75% · takeouts/game 0.0

## 4. Waiter speed

_With 4.5s eating, can waiters get there in time? "Diners watched" = share of seated diners with a waiter at their table when they finished._

Tables a waiter can reach within one eating time if it only starts walking once the diner sits down:

| Waiter speed | From its restaurant corner | From mid-court |
|---|---|---|
| 2 | 19% | 100% |
| 3 | 50% | 100% |
| 4 | 94% | 100% |

### waiter speed 2

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 26% | 2.51 | 377 | 25% | 3.7 | 100% | 62s | 78% | 39 / 44 | 78 |
| hybrid | 30% | 2.19 | 408 | 26% | 3.4 | 100% | 62s | 67% | 41 / 43 | 67 |
| hawk | 14% | 3.10 | 324 | 23% | 3.9 | 100% | 91s | 43% | 21 / 57 | 44 |

Money spread 0.56 · leader at 2:00 wins 48% · lead changes 7.4 · trend shifts recovered 99% (avg 46s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 9% · diners watched by a waiter 72% · takeouts/game 0.1

### waiter speed 3

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 24% | 2.55 | 378 | 25% | 3.7 | 100% | 54s | 78% | 39 / 46 | 77 |
| hybrid | 31% | 2.19 | 413 | 26% | 3.4 | 100% | 60s | 73% | 42 / 45 | 68 |
| hawk | 14% | 3.06 | 334 | 23% | 3.9 | 100% | 88s | 47% | 23 / 59 | 45 |

Money spread 0.54 · leader at 2:00 wins 48% · lead changes 7.9 · trend shifts recovered 99% (avg 47s) · report delay 10.4s · ideal moved 0.29 pts by delivery · direction already wrong 9% · diners watched by a waiter 75% · takeouts/game 0.1

### waiter speed 4

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 31% | 2.49 | 386 | 25% | 3.6 | 100% | 56s | 81% | 39 / 50 | 77 |
| hybrid | 28% | 2.26 | 410 | 26% | 3.4 | 100% | 60s | 71% | 40 / 49 | 68 |
| hawk | 14% | 3.00 | 339 | 24% | 3.8 | 100% | 81s | 54% | 25 / 61 | 47 |

Money spread 0.57 · leader at 2:00 wins 48% · lead changes 8.2 · trend shifts recovered 100% (avg 46s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 9% · diners watched by a waiter 78% · takeouts/game 0.1

## 5. Is copying still too cheap?

_Copycat among intel gatherers, under the new defaults._

### vs searchers

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 23% | 2.70 | 348 | 24% | 4.0 | 100% | 104s | 40% | 84 / 9 | 46 |
| copycat | 31% | 1.90 | 427 | 27% | 3.4 | 100% | 61s | 63% | 13 / 0 | 49 |

Money spread 0.70 · leader at 2:00 wins 44% · lead changes 6.9 · trend shifts recovered 98% (avg 52s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 62% · takeouts/game 0.1

### vs hybrids

Lineup: hybrid, hybrid, hybrid, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 30% | 2.38 | 365 | 25% | 3.7 | 100% | 75s | 63% | 51 / 51 | 73 |
| copycat | 9% | 2.87 | 339 | 24% | 3.8 | 100% | 79s | 60% | 12 / 0 | 53 |

Money spread 0.39 · leader at 2:00 wins 55% · lead changes 9.0 · trend shifts recovered 96% (avg 56s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 69% · takeouts/game 0.1

### vs analysts

Lineup: analyst, analyst, analyst, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 29% | 2.53 | 383 | 25% | 3.6 | 100% | 54s | 74% | 50 / 52 | 72 |
| copycat | 13% | 2.40 | 393 | 25% | 3.5 | 100% | 53s | 71% | 12 / 0 | 59 |

Money spread 0.51 · leader at 2:00 wins 45% · lead changes 7.8 · trend shifts recovered 100% (avg 48s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 69% · takeouts/game 0.0

## 6. p=1 vs p=2, smarter bots

_Confirms the p=1 decision with the new lineup._

### p=1

Lineup: analyst, hybrid, hawk, searcher · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 37% | 2.02 | 432 | 27% | 3.6 | 100% | 52s | 78% | 48 / 49 | 80 |
| hybrid | 39% | 1.90 | 448 | 28% | 3.4 | 100% | 61s | 73% | 49 / 47 | 69 |
| hawk | 18% | 2.56 | 370 | 25% | 3.9 | 100% | 80s | 51% | 28 / 62 | 48 |
| searcher | 7% | 3.52 | 253 | 20% | 4.6 | 98% | 163s | 22% | 53 / 9 | 36 |

Money spread 0.80 · leader at 2:00 wins 51% · lead changes 6.5 · trend shifts recovered 100% (avg 48s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 75% · takeouts/game 0.1

### p=2

Lineup: analyst, hybrid, hawk, searcher · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 39% | 1.96 | 458 | 28% | 3.6 | 100% | 52s | 74% | 49 / 48 | 77 |
| hybrid | 34% | 1.99 | 461 | 29% | 3.4 | 100% | 59s | 75% | 50 / 47 | 69 |
| hawk | 22% | 2.54 | 381 | 25% | 3.8 | 100% | 81s | 53% | 28 / 61 | 47 |
| searcher | 6% | 3.52 | 235 | 19% | 4.9 | 94% | 183s | 21% | 45 / 12 | 32 |

Money spread 0.96 · leader at 2:00 wins 55% · lead changes 5.5 · trend shifts recovered 100% (avg 44s) · report delay 10.4s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 74% · takeouts/game 0.0
