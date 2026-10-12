# Simulation results

Generated 2026-10-12 16:07 · 200 games per batch.

**Columns:** distances are in "1–10 units" (raw slider points ÷ (scale/10)), summed over 4
ingredients. "Got close" = reached distance ≤ 2 at some point. "Ever exact" = matched the ideal
exactly at some point. Customer share = fraction of all customers served.

<details><summary>Default config</summary>

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
  "shareP": 2,
  "shareMaxAgeSec": 30,
  "queuePenalty": 0.15,
  "arrivalMeanSec": 1.5,
  "serviceSec": 1.5,
  "eatSec": 7,
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
  "driftEverySec": 5,
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

## 1. Baseline

_With default settings, how do the simple strategies compare?_

### Default config

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 28% | 2.27 | 318 | 27% | 4.6 | 99% | 138s | 19% | 78 / 8 | 63 |
| hybrid | 64% | 1.53 | 425 | 34% | 4.0 | 100% | 79s | 37% | 83 / 34 | 91 |
| copycat | 8% | 2.25 | 343 | 29% | 4.2 | 100% | 95s | 28% | 14 / 0 | 56 |
| static | 1% | 3.94 | 33 | 11% | 11.7 | 7% | 55s | 0% | 5 / 0 | 1 |

Money spread 1.56 · leader at 2:00 wins 57% · lead changes 4.7 · trend shifts recovered 95% (avg 62s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 0.7

## 2. Is copying too cheap?

_One copycat among three players who gather intel. Does the free rider beat the people doing the work, and how much does a retooling cost change that?_

### No change cost

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 27% | 2.65 | 281 | 24% | 4.7 | 97% | 139s | 20% | 73 / 10 | 60 |
| copycat | 21% | 2.04 | 350 | 28% | 4.1 | 100% | 70s | 33% | 13 / 0 | 58 |

Money spread 0.97 · leader at 2:00 wins 45% · lead changes 5.6 · trend shifts recovered 97% (avg 55s) · report delay 13.0s · ideal moved 0.71 pts by delivery · direction already wrong 19% · takeouts/game 0.8

### Retool 0.5s per point

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 27% | 2.64 | 282 | 24% | 4.7 | 98% | 138s | 19% | 75 / 10 | 61 |
| copycat | 20% | 2.08 | 342 | 27% | 4.1 | 100% | 73s | 33% | 13 / 0 | 59 |

Money spread 0.95 · leader at 2:00 wins 54% · lead changes 5.3 · trend shifts recovered 97% (avg 55s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 19% · takeouts/game 1.0

### Retool 1s per point

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 28% | 2.60 | 291 | 25% | 4.7 | 99% | 132s | 21% | 76 / 9 | 61 |
| copycat | 15% | 2.19 | 329 | 26% | 4.1 | 100% | 73s | 29% | 13 / 0 | 60 |

Money spread 0.87 · leader at 2:00 wins 48% · lead changes 5.5 · trend shifts recovered 97% (avg 56s) · report delay 13.0s · ideal moved 0.69 pts by delivery · direction already wrong 19% · takeouts/game 2.9

### vs hybrids, no change cost

Lineup: hybrid, hybrid, hybrid, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 31% | 2.32 | 306 | 26% | 4.2 | 100% | 83s | 33% | 53 / 42 | 89 |
| copycat | 7% | 3.04 | 265 | 23% | 4.3 | 100% | 89s | 28% | 11 / 0 | 63 |

Money spread 0.49 · leader at 2:00 wins 54% · lead changes 7.4 · trend shifts recovered 90% (avg 58s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 0.8

### vs hybrids, retool 1s per point

Lineup: hybrid, hybrid, hybrid, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 32% | 2.28 | 303 | 26% | 4.3 | 100% | 98s | 33% | 55 / 42 | 88 |
| copycat | 3% | 3.17 | 257 | 23% | 4.4 | 100% | 102s | 31% | 11 / 0 | 62 |

Money spread 0.50 · leader at 2:00 wins 47% · lead changes 7.1 · trend shifts recovered 89% (avg 60s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 4.9

## 3. Magnitude variants (DESIGN.md §6)

_A = direction only, B = magnitude on every report, C = magnitude only on your own pizza._

### A: magnitude=none

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 6% | 3.60 | 167 | 18% | 5.5 | 88% | 201s | 7% | 45 / 13 | 50 |
| hybrid | 34% | 1.98 | 366 | 28% | 4.0 | 100% | 79s | 38% | 50 / 40 | 85 |
| hawk | 26% | 2.44 | 311 | 25% | 4.3 | 100% | 95s | 20% | 26 / 59 | 70 |

Money spread 0.98 · leader at 2:00 wins 47% · lead changes 6.6 · trend shifts recovered 99% (avg 52s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 1.0

### B: magnitude=all

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 5% | 3.64 | 225 | 18% | 4.5 | 99% | 143s | 19% | 46 / 12 | 44 |
| hybrid | 35% | 1.96 | 454 | 28% | 3.2 | 100% | 49s | 57% | 49 / 40 | 83 |
| hawk | 27% | 2.44 | 408 | 26% | 3.4 | 100% | 64s | 52% | 26 / 59 | 61 |

Money spread 0.88 · leader at 2:00 wins 46% · lead changes 6.7 · trend shifts recovered 100% (avg 32s) · report delay 13.0s · ideal moved 0.71 pts by delivery · direction already wrong 23% · takeouts/game 0.9

### C: magnitude=own

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 12% | 3.13 | 281 | 21% | 4.4 | 100% | 151s | 23% | 52 / 10 | 47 |
| hybrid | 39% | 1.89 | 436 | 28% | 3.4 | 100% | 53s | 51% | 51 / 39 | 84 |
| hawk | 10% | 3.09 | 291 | 22% | 4.1 | 100% | 90s | 26% | 22 / 60 | 67 |

Money spread 0.90 · leader at 2:00 wins 54% · lead changes 5.3 · trend shifts recovered 100% (avg 36s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 23% · takeouts/game 0.6

## 4. Slider scale

_How does the range affect how fast intel-gathering players converge? (4 hybrids)_

### scale 1–10

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 234 | 25% | 4.9 | 100% | 73s | 64% | 43 / 38 | 90 |

Money spread 0.61 · leader at 2:00 wins 39% · lead changes 6.6 · trend shifts recovered 99% (avg 39s) · report delay 13.0s · ideal moved 0.59 pts by delivery · direction already wrong 26% · takeouts/game 0.7

### scale 1–20

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 310 | 25% | 4.1 | 100% | 88s | 33% | 44 / 38 | 84 |

Money spread 0.50 · leader at 2:00 wins 47% · lead changes 7.5 · trend shifts recovered 94% (avg 54s) · report delay 13.0s · ideal moved 0.69 pts by delivery · direction already wrong 20% · takeouts/game 0.8

### scale 1–25

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 311 | 25% | 4.1 | 100% | 100s | 23% | 45 / 38 | 84 |

Money spread 0.49 · leader at 2:00 wins 49% · lead changes 7.9 · trend shifts recovered 88% (avg 60s) · report delay 13.0s · ideal moved 0.75 pts by delivery · direction already wrong 19% · takeouts/game 0.9

## 5. Customer-share sharpness

_How strongly should accuracy pull customers? p is the exponent; "no max age" is pure last-N pizzas (the stale-reputation trap)._

### p=1

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 26% | 2.35 | 315 | 27% | 4.4 | 100% | 125s | 23% | 85 / 4 | 65 |
| hybrid | 65% | 1.48 | 407 | 32% | 4.0 | 100% | 76s | 41% | 83 / 33 | 90 |
| copycat | 10% | 2.19 | 348 | 29% | 4.2 | 100% | 88s | 38% | 14 / 0 | 55 |
| static | 0% | 3.98 | 38 | 12% | 11.5 | 12% | 203s | 1% | 6 / 0 | 1 |

Money spread 1.43 · leader at 2:00 wins 56% · lead changes 6.7 · trend shifts recovered 94% (avg 60s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 19% · takeouts/game 0.9

### p=2 (default)

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 28% | 2.27 | 318 | 27% | 4.6 | 99% | 138s | 19% | 78 / 8 | 63 |
| hybrid | 64% | 1.53 | 425 | 34% | 4.0 | 100% | 79s | 37% | 83 / 34 | 91 |
| copycat | 8% | 2.25 | 343 | 29% | 4.2 | 100% | 95s | 28% | 14 / 0 | 56 |
| static | 1% | 3.94 | 33 | 11% | 11.7 | 7% | 55s | 0% | 5 / 0 | 1 |

Money spread 1.56 · leader at 2:00 wins 57% · lead changes 4.7 · trend shifts recovered 95% (avg 62s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 0.7

### p=4

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 27% | 2.30 | 302 | 26% | 5.0 | 95% | 163s | 19% | 68 / 13 | 58 |
| hybrid | 71% | 1.43 | 466 | 37% | 4.0 | 100% | 76s | 38% | 84 / 36 | 90 |
| copycat | 3% | 2.37 | 318 | 27% | 4.3 | 100% | 90s | 30% | 14 / 0 | 57 |
| static | 0% | 3.91 | 38 | 10% | 11.7 | 9% | 149s | 1% | 5 / 0 | 1 |

Money spread 1.76 · leader at 2:00 wins 59% · lead changes 3.5 · trend shifts recovered 93% (avg 63s) · report delay 13.1s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 0.7

### p=4, no max age

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 39% | 2.06 | 399 | 32% | 5.8 | 79% | 172s | 15% | 62 / 18 | 48 |
| hybrid | 57% | 1.71 | 551 | 43% | 4.1 | 100% | 85s | 40% | 82 / 43 | 92 |
| copycat | 2% | 2.71 | 162 | 18% | 4.4 | 100% | 105s | 36% | 9 / 0 | 61 |
| static | 2% | 3.52 | 40 | 7% | 11.9 | 8% | 129s | 1% | 3 / 0 | 1 |

Money spread 2.72 · leader at 2:00 wins 63% · lead changes 2.6 · trend shifts recovered 89% (avg 62s) · report delay 13.2s · ideal moved 0.71 pts by delivery · direction already wrong 20% · takeouts/game 0.4

## 6. Eating time vs report staleness

_Reports are delayed by walk + eat time. How stale are they, and does it matter? (4 hybrids)_

### eat 4s

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 336 | 25% | 3.8 | 100% | 74s | 40% | 42 / 46 | 86 |

Money spread 0.49 · leader at 2:00 wins 45% · lead changes 7.3 · trend shifts recovered 97% (avg 52s) · report delay 9.9s · ideal moved 0.56 pts by delivery · direction already wrong 18% · takeouts/game 0.0

### eat 7s

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 310 | 25% | 4.1 | 100% | 88s | 33% | 44 / 38 | 84 |

Money spread 0.50 · leader at 2:00 wins 47% · lead changes 7.5 · trend shifts recovered 94% (avg 54s) · report delay 13.0s · ideal moved 0.69 pts by delivery · direction already wrong 20% · takeouts/game 0.8

### eat 10s

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 274 | 25% | 4.4 | 100% | 110s | 22% | 47 / 30 | 81 |

Money spread 0.53 · leader at 2:00 wins 47% · lead changes 7.7 · trend shifts recovered 87% (avg 62s) · report delay 16.0s · ideal moved 0.82 pts by delivery · direction already wrong 22% · takeouts/game 6.4

## 7. Drift speed vs intel rate

_Does the ideal drift faster than players can learn it? Drift = one random ingredient ±1 every N seconds. (searcher, hybrid, hawk, hybrid)_

### drift every 5s

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 6% | 3.60 | 167 | 18% | 5.5 | 88% | 201s | 7% | 45 / 13 | 50 |
| hybrid | 34% | 1.98 | 366 | 28% | 4.0 | 100% | 79s | 38% | 50 / 40 | 85 |
| hawk | 26% | 2.44 | 311 | 25% | 4.3 | 100% | 95s | 20% | 26 / 59 | 70 |

Money spread 0.98 · leader at 2:00 wins 47% · lead changes 6.6 · trend shifts recovered 99% (avg 52s) · report delay 13.0s · ideal moved 0.70 pts by delivery · direction already wrong 20% · takeouts/game 1.0

### drift every 10s

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 10% | 3.33 | 219 | 19% | 5.0 | 93% | 196s | 13% | 49 / 11 | 40 |
| hybrid | 31% | 2.12 | 386 | 28% | 3.8 | 100% | 74s | 44% | 49 / 41 | 75 |
| hawk | 28% | 2.44 | 347 | 26% | 4.1 | 100% | 92s | 30% | 26 / 59 | 55 |

Money spread 0.92 · leader at 2:00 wins 44% · lead changes 5.7 · trend shifts recovered 97% (avg 53s) · report delay 13.0s · ideal moved 0.50 pts by delivery · direction already wrong 15% · takeouts/game 0.6

### drift every 20s

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 9% | 3.36 | 234 | 20% | 4.9 | 94% | 182s | 13% | 49 / 11 | 34 |
| hybrid | 30% | 2.17 | 401 | 27% | 3.7 | 100% | 69s | 57% | 48 / 41 | 68 |
| hawk | 33% | 2.31 | 381 | 26% | 3.9 | 100% | 81s | 40% | 27 / 59 | 46 |

Money spread 0.92 · leader at 2:00 wins 48% · lead changes 5.7 · trend shifts recovered 98% (avg 52s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### no drift (trend shifts only)

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 3% | 3.68 | 249 | 17% | 4.4 | 90% | 166s | 37% | 45 / 12 | 24 |
| hybrid | 33% | 2.03 | 579 | 28% | 2.7 | 100% | 60s | 98% | 49 / 40 | 48 |
| hawk | 31% | 2.27 | 545 | 27% | 2.9 | 100% | 66s | 97% | 28 / 58 | 28 |

Money spread 1.01 · leader at 2:00 wins 50% · lead changes 6.4 · trend shifts recovered 100% (avg 46s) · report delay 13.0s · ideal moved 0.19 pts by delivery · direction already wrong 3% · takeouts/game 0.8
