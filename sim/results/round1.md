# Simulation results

Generated 2026-10-12 16:25 · 200 games per batch.

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

## 1. Baseline

_With default settings, how do the simple strategies compare?_

### Default config

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 30% | 2.25 | 372 | 27% | 4.4 | 100% | 143s | 32% | 79 / 7 | 43 |
| hybrid | 60% | 1.54 | 480 | 33% | 3.7 | 100% | 73s | 56% | 82 / 35 | 71 |
| copycat | 11% | 2.25 | 394 | 29% | 3.9 | 100% | 81s | 50% | 14 / 0 | 45 |
| static | 0% | 3.96 | 35 | 10% | 11.5 | 6% | 105s | 0% | 5 / 0 | 1 |

Money spread 1.56 · leader at 2:00 wins 61% · lead changes 5.0 · trend shifts recovered 95% (avg 63s) · report delay 13.0s · ideal moved 0.36 pts by delivery · direction already wrong 10% · takeouts/game 0.8

## 2. Is copying too cheap?

_One copycat among three players who gather intel. Does the free rider beat the people doing the work, and how much does a retooling cost change that?_

### No change cost

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 25% | 2.68 | 321 | 24% | 4.4 | 98% | 134s | 29% | 73 / 10 | 41 |
| copycat | 26% | 1.97 | 403 | 28% | 3.7 | 100% | 70s | 50% | 14 / 0 | 47 |

Money spread 0.91 · leader at 2:00 wins 47% · lead changes 6.1 · trend shifts recovered 97% (avg 58s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### Retool 0.5s per point

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 24% | 2.70 | 325 | 24% | 4.4 | 99% | 136s | 30% | 74 / 10 | 42 |
| copycat | 28% | 1.91 | 413 | 28% | 3.7 | 100% | 68s | 54% | 14 / 0 | 47 |

Money spread 0.93 · leader at 2:00 wins 49% · lead changes 5.3 · trend shifts recovered 98% (avg 58s) · report delay 13.0s · ideal moved 0.36 pts by delivery · direction already wrong 10% · takeouts/game 1.0

### Retool 1s per point

Lineup: searcher, searcher, searcher, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 26% | 2.65 | 332 | 24% | 4.4 | 98% | 137s | 31% | 75 / 10 | 42 |
| copycat | 21% | 2.04 | 403 | 27% | 3.7 | 100% | 72s | 52% | 13 / 0 | 46 |

Money spread 0.91 · leader at 2:00 wins 49% · lead changes 5.8 · trend shifts recovered 97% (avg 58s) · report delay 13.0s · ideal moved 0.36 pts by delivery · direction already wrong 10% · takeouts/game 2.7

### vs hybrids, no change cost

Lineup: hybrid, hybrid, hybrid, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 31% | 2.36 | 335 | 26% | 4.0 | 100% | 85s | 46% | 54 / 42 | 71 |
| copycat | 7% | 2.91 | 296 | 23% | 4.1 | 100% | 94s | 38% | 11 / 0 | 52 |

Money spread 0.52 · leader at 2:00 wins 47% · lead changes 6.9 · trend shifts recovered 93% (avg 62s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### vs hybrids, retool 1s per point

Lineup: hybrid, hybrid, hybrid, copycat · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 31% | 2.34 | 326 | 26% | 4.2 | 100% | 102s | 46% | 54 / 43 | 71 |
| copycat | 8% | 2.97 | 288 | 23% | 4.3 | 100% | 117s | 42% | 11 / 0 | 52 |

Money spread 0.54 · leader at 2:00 wins 49% · lead changes 7.3 · trend shifts recovered 92% (avg 64s) · report delay 13.0s · ideal moved 0.37 pts by delivery · direction already wrong 10% · takeouts/game 5.6

## 3. Magnitude variants (DESIGN.md §6)

_A = direction only, B = magnitude on every report, C = magnitude only on your own pizza._

### A: magnitude=none

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 9% | 3.36 | 234 | 20% | 4.9 | 94% | 182s | 13% | 49 / 11 | 34 |
| hybrid | 30% | 2.17 | 401 | 27% | 3.7 | 100% | 69s | 57% | 48 / 41 | 68 |
| hawk | 33% | 2.31 | 381 | 26% | 3.9 | 100% | 81s | 40% | 27 / 59 | 46 |

Money spread 0.92 · leader at 2:00 wins 48% · lead changes 5.7 · trend shifts recovered 98% (avg 52s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### B: magnitude=all

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 5% | 3.67 | 284 | 17% | 3.9 | 98% | 129s | 39% | 46 / 12 | 29 |
| hybrid | 34% | 2.02 | 598 | 28% | 2.4 | 100% | 45s | 94% | 49 / 40 | 62 |
| hawk | 28% | 2.28 | 558 | 27% | 2.6 | 100% | 58s | 90% | 27 / 58 | 39 |

Money spread 0.88 · leader at 2:00 wins 47% · lead changes 6.4 · trend shifts recovered 100% (avg 32s) · report delay 13.0s · ideal moved 0.36 pts by delivery · direction already wrong 12% · takeouts/game 0.8

### C: magnitude=own

Lineup: searcher, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 19% | 2.92 | 391 | 22% | 3.6 | 100% | 125s | 53% | 54 / 9 | 30 |
| hybrid | 34% | 2.00 | 566 | 28% | 2.7 | 100% | 48s | 90% | 51 / 39 | 63 |
| hawk | 13% | 3.08 | 365 | 22% | 3.6 | 100% | 70s | 64% | 21 / 61 | 42 |

Money spread 0.91 · leader at 2:00 wins 54% · lead changes 5.2 · trend shifts recovered 100% (avg 35s) · report delay 13.0s · ideal moved 0.36 pts by delivery · direction already wrong 12% · takeouts/game 0.8

## 4. Slider scale

_How does the range affect how fast intel-gathering players converge? (4 hybrids)_

### scale 1–10

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 353 | 25% | 3.8 | 100% | 65s | 89% | 44 / 38 | 66 |

Money spread 0.67 · leader at 2:00 wins 47% · lead changes 6.3 · trend shifts recovered 100% (avg 39s) · report delay 13.0s · ideal moved 0.25 pts by delivery · direction already wrong 12% · takeouts/game 0.8

### scale 1–20

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 340 | 25% | 3.9 | 100% | 89s | 51% | 44 / 38 | 68 |

Money spread 0.52 · leader at 2:00 wins 46% · lead changes 7.2 · trend shifts recovered 96% (avg 54s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### scale 1–25

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 332 | 25% | 4.0 | 100% | 94s | 37% | 44 / 38 | 69 |

Money spread 0.56 · leader at 2:00 wins 53% · lead changes 6.8 · trend shifts recovered 93% (avg 61s) · report delay 13.0s · ideal moved 0.41 pts by delivery · direction already wrong 9% · takeouts/game 0.8

## 5. Customer-share sharpness

_How strongly should accuracy pull customers? p is the exponent; "no max age" is pure last-N pizzas (the stale-reputation trap)._

### p=1

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 39% | 2.06 | 381 | 29% | 4.1 | 100% | 112s | 35% | 86 / 4 | 47 |
| hybrid | 48% | 1.75 | 444 | 31% | 3.8 | 100% | 66s | 60% | 83 / 34 | 72 |
| copycat | 14% | 2.21 | 398 | 29% | 3.9 | 100% | 76s | 47% | 14 / 0 | 46 |
| static | 0% | 3.98 | 34 | 11% | 11.8 | 6% | 65s | 1% | 5 / 0 | 1 |

Money spread 1.46 · leader at 2:00 wins 54% · lead changes 7.0 · trend shifts recovered 95% (avg 63s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 9% · takeouts/game 0.8

### p=2 (default)

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 30% | 2.25 | 372 | 27% | 4.4 | 100% | 143s | 32% | 79 / 7 | 43 |
| hybrid | 60% | 1.54 | 480 | 33% | 3.7 | 100% | 73s | 56% | 82 / 35 | 71 |
| copycat | 11% | 2.25 | 394 | 29% | 3.9 | 100% | 81s | 50% | 14 / 0 | 45 |
| static | 0% | 3.96 | 35 | 10% | 11.5 | 6% | 105s | 0% | 5 / 0 | 1 |

Money spread 1.56 · leader at 2:00 wins 61% · lead changes 5.0 · trend shifts recovered 95% (avg 63s) · report delay 13.0s · ideal moved 0.36 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### p=4

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 32% | 2.16 | 369 | 27% | 4.6 | 94% | 154s | 35% | 69 / 13 | 39 |
| hybrid | 61% | 1.54 | 522 | 36% | 3.7 | 100% | 72s | 63% | 83 / 37 | 70 |
| copycat | 7% | 2.35 | 369 | 28% | 3.9 | 100% | 86s | 56% | 13 / 0 | 45 |
| static | 0% | 3.94 | 37 | 10% | 11.4 | 7% | 111s | 0% | 5 / 0 | 1 |

Money spread 1.73 · leader at 2:00 wins 56% · lead changes 3.5 · trend shifts recovered 92% (avg 63s) · report delay 13.1s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### p=4, no max age

Lineup: searcher, hybrid, copycat, static · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| searcher | 43% | 2.00 | 483 | 33% | 5.1 | 78% | 164s | 27% | 62 / 19 | 33 |
| hybrid | 53% | 1.75 | 597 | 43% | 3.8 | 100% | 85s | 47% | 81 / 43 | 71 |
| copycat | 3% | 2.77 | 181 | 18% | 4.0 | 100% | 109s | 46% | 9 / 0 | 47 |
| static | 2% | 3.48 | 50 | 7% | 11.5 | 6% | 88s | 0% | 3 / 0 | 1 |

Money spread 2.67 · leader at 2:00 wins 65% · lead changes 2.4 · trend shifts recovered 92% (avg 64s) · report delay 13.2s · ideal moved 0.36 pts by delivery · direction already wrong 10% · takeouts/game 0.4

## 6. Eating time vs report staleness

_Reports are delayed by walk + eat time. How stale are they, and does it matter? (4 hybrids)_

### eat 4s

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 368 | 25% | 3.6 | 100% | 69s | 60% | 41 / 46 | 69 |

Money spread 0.56 · leader at 2:00 wins 46% · lead changes 7.0 · trend shifts recovered 97% (avg 54s) · report delay 9.9s · ideal moved 0.27 pts by delivery · direction already wrong 8% · takeouts/game 0.0

### eat 7s

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 340 | 25% | 3.9 | 100% | 89s | 51% | 44 / 38 | 68 |

Money spread 0.52 · leader at 2:00 wins 46% · lead changes 7.2 · trend shifts recovered 96% (avg 54s) · report delay 13.0s · ideal moved 0.35 pts by delivery · direction already wrong 10% · takeouts/game 0.8

### eat 10s

Lineup: hybrid, hybrid, hybrid, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| hybrid | 25% | 2.50 | 308 | 25% | 4.2 | 100% | 106s | 39% | 47 / 30 | 67 |

Money spread 0.56 · leader at 2:00 wins 46% · lead changes 7.5 · trend shifts recovered 89% (avg 61s) · report delay 16.0s · ideal moved 0.44 pts by delivery · direction already wrong 12% · takeouts/game 6.3

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
