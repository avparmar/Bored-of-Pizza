# Simulation results: Round 3: human-like bots, trend shifts vs penalty

Generated 2026-10-12 22:02 UTC · 200 games per batch.

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
  "pregameSec": 20,
  "tipBase": 10,
  "tipK": 0.35,
  "tipNoise": 0.2,
  "shareWindow": 10,
  "shareP": 1,
  "shareMaxAgeSec": 30,
  "shareFloor": 0,
  "shareCap": 1,
  "queuePenalty": 0.15,
  "arrivalMeanSec": 1.5,
  "serviceSec": 1.5,
  "eatSec": 4.5,
  "courtSize": 20,
  "customerSpeed": 2.5,
  "waiterSpeed": 3,
  "tableGrid": 4,
  "waitersPerPlayer": 2,
  "waiterAutoReturn": true,
  "waiterIdleReturnSec": 3,
  "customerWalkIn": true,
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
  "trendShiftRampSec": 0,
  "retoolSecPerPoint": 0,
  "retoolCostPerPoint": 0
}
```
</details>

## 1. Human-like bots vs superhuman bots

_Human-like bots look every 2s, react 0.8–2s late and send at most one waiter per look. How much does that change intel and outcomes?_

### superhuman · superhuman bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 28% | 2.48 | 396 | 25% | 3.5 | 100% | 63s | 81% | 49 / 41 | 87 |
| hybrid | 28% | 2.27 | 421 | 26% | 3.3 | 100% | 63s | 77% | 51 / 39 | 69 |
| hawk | 15% | 2.98 | 354 | 24% | 3.8 | 100% | 92s | 52% | 33 / 50 | 45 |

Money spread 0.53 · leader at 2:00 wins 44% · lead changes 7.5 · trend shifts recovered 100% (avg 42s) · report delay 8.5s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 78% · income gap after shifts 1.23 (typical minute 1.32) · takeouts/game 0.0

### human-like · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 30% | 2.37 | 374 | 25% | 3.8 | 100% | 77s | 63% | 64 / 25 | 65 |
| hybrid | 30% | 2.23 | 392 | 26% | 3.6 | 100% | 71s | 70% | 65 / 24 | 65 |
| hawk | 11% | 3.18 | 299 | 23% | 4.2 | 100% | 114s | 34% | 20 / 48 | 40 |

Money spread 0.61 · leader at 2:00 wins 49% · lead changes 7.1 · trend shifts recovered 99% (avg 48s) · report delay 8.6s · ideal moved 0.24 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.27 (typical minute 1.38) · takeouts/game 0.0

## 2. Gentler trend shifts

_Default: 2 ingredients jump 4–8 points instantly. "Income gap after shifts" = (best − worst) / average income in the 60s after a shift; compare with a typical minute._

### instant (current) · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 30% | 2.37 | 374 | 25% | 3.8 | 100% | 77s | 63% | 64 / 25 | 65 |
| hybrid | 30% | 2.23 | 392 | 26% | 3.6 | 100% | 71s | 70% | 65 / 24 | 65 |
| hawk | 11% | 3.18 | 299 | 23% | 4.2 | 100% | 114s | 34% | 20 / 48 | 40 |

Money spread 0.61 · leader at 2:00 wins 49% · lead changes 7.1 · trend shifts recovered 99% (avg 48s) · report delay 8.6s · ideal moved 0.24 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.27 (typical minute 1.38) · takeouts/game 0.0

### gradual over 20s · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 30% | 2.44 | 377 | 25% | 3.7 | 100% | 76s | 63% | 63 / 26 | 65 |
| hybrid | 29% | 2.19 | 396 | 26% | 3.6 | 100% | 71s | 60% | 65 / 23 | 65 |
| hawk | 12% | 3.17 | 297 | 23% | 4.2 | 100% | 114s | 35% | 19 / 48 | 40 |

Money spread 0.60 · leader at 2:00 wins 53% · lead changes 7.8 · trend shifts recovered 100% (avg 3s) · report delay 8.6s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.22 (typical minute 1.38) · takeouts/game 0.0

### gradual over 40s · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 28% | 2.49 | 357 | 25% | 3.8 | 100% | 77s | 57% | 62 / 26 | 66 |
| hybrid | 32% | 2.13 | 393 | 26% | 3.5 | 100% | 71s | 60% | 66 / 23 | 66 |
| hawk | 8% | 3.26 | 290 | 23% | 4.2 | 100% | 112s | 30% | 20 / 48 | 41 |

Money spread 0.60 · leader at 2:00 wins 46% · lead changes 7.1 · trend shifts recovered 100% (avg 4s) · report delay 8.6s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.21 (typical minute 1.37) · takeouts/game 0.0

### 1 ingredient, instant · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 25% | 2.46 | 465 | 25% | 3.0 | 100% | 77s | 83% | 63 / 25 | 64 |
| hybrid | 33% | 2.15 | 499 | 26% | 2.7 | 100% | 70s | 84% | 65 / 23 | 61 |
| hawk | 10% | 3.24 | 376 | 23% | 3.4 | 100% | 105s | 50% | 20 / 48 | 38 |

Money spread 0.56 · leader at 2:00 wins 50% · lead changes 8.0 · trend shifts recovered 100% (avg 12s) · report delay 8.6s · ideal moved 0.17 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.18 (typical minute 1.30) · takeouts/game 0.0

### smaller (2–5 points), instant · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 31% | 2.33 | 447 | 26% | 3.2 | 100% | 77s | 75% | 65 / 25 | 64 |
| hybrid | 30% | 2.24 | 447 | 26% | 3.1 | 100% | 71s | 77% | 65 / 24 | 64 |
| hawk | 9% | 3.19 | 351 | 23% | 3.7 | 100% | 110s | 46% | 20 / 48 | 39 |

Money spread 0.56 · leader at 2:00 wins 44% · lead changes 8.2 · trend shifts recovered 100% (avg 28s) · report delay 8.6s · ideal moved 0.18 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.19 (typical minute 1.32) · takeouts/game 0.0

## 3. Lighter penalty for being wrong

_tipK sets how fast tips (and accuracy) fall with distance. Share floor/cap keep every shop between 10% and 45% of customers._

### k=0.35 (current) · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 30% | 2.37 | 374 | 25% | 3.8 | 100% | 77s | 63% | 64 / 25 | 65 |
| hybrid | 30% | 2.23 | 392 | 26% | 3.6 | 100% | 71s | 70% | 65 / 24 | 65 |
| hawk | 11% | 3.18 | 299 | 23% | 4.2 | 100% | 114s | 34% | 20 / 48 | 40 |

Money spread 0.61 · leader at 2:00 wins 49% · lead changes 7.1 · trend shifts recovered 99% (avg 48s) · report delay 8.6s · ideal moved 0.24 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.27 (typical minute 1.38) · takeouts/game 0.0

### k=0.25 · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 30% | 2.45 | 460 | 25% | 3.8 | 100% | 78s | 65% | 63 / 25 | 66 |
| hybrid | 28% | 2.20 | 491 | 26% | 3.6 | 100% | 74s | 68% | 65 / 23 | 65 |
| hawk | 14% | 3.15 | 396 | 23% | 4.2 | 100% | 107s | 39% | 21 / 46 | 40 |

Money spread 0.48 · leader at 2:00 wins 48% · lead changes 8.6 · trend shifts recovered 100% (avg 47s) · report delay 8.6s · ideal moved 0.24 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.03 (typical minute 1.13) · takeouts/game 0.0

### k=0.18 · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 29% | 2.41 | 544 | 25% | 3.9 | 100% | 79s | 67% | 64 / 25 | 67 |
| hybrid | 28% | 2.28 | 567 | 26% | 3.7 | 100% | 75s | 57% | 66 / 23 | 65 |
| hawk | 14% | 3.04 | 492 | 24% | 4.2 | 100% | 108s | 38% | 21 / 46 | 40 |

Money spread 0.37 · leader at 2:00 wins 49% · lead changes 10.1 · trend shifts recovered 100% (avg 51s) · report delay 8.6s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 0.87 (typical minute 0.96) · takeouts/game 0.0

### share 10–45% · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 27% | 2.45 | 366 | 25% | 3.8 | 100% | 79s | 67% | 64 / 25 | 66 |
| hybrid | 31% | 2.20 | 395 | 26% | 3.6 | 100% | 71s | 68% | 66 / 23 | 65 |
| hawk | 12% | 3.15 | 304 | 23% | 4.2 | 100% | 115s | 36% | 20 / 47 | 40 |

Money spread 0.59 · leader at 2:00 wins 46% · lead changes 7.7 · trend shifts recovered 99% (avg 48s) · report delay 8.6s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.25 (typical minute 1.34) · takeouts/game 0.0

### k=0.25 + share 10–45% · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 29% | 2.40 | 464 | 25% | 3.8 | 100% | 79s | 65% | 64 / 25 | 66 |
| hybrid | 28% | 2.25 | 489 | 26% | 3.6 | 100% | 73s | 69% | 65 / 23 | 64 |
| hawk | 16% | 3.09 | 401 | 23% | 4.1 | 100% | 109s | 35% | 21 / 47 | 40 |

Money spread 0.48 · leader at 2:00 wins 46% · lead changes 8.4 · trend shifts recovered 100% (avg 48s) · report delay 8.6s · ideal moved 0.24 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.04 (typical minute 1.13) · takeouts/game 0.0

## 4. Combined

_Gradual 20s shifts together with a lighter penalty._

### gradual 20s + share 10–45% · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 28% | 2.40 | 369 | 25% | 3.7 | 100% | 77s | 64% | 63 / 25 | 66 |
| hybrid | 31% | 2.18 | 391 | 26% | 3.6 | 100% | 71s | 60% | 66 / 24 | 65 |
| hawk | 11% | 3.24 | 303 | 23% | 4.1 | 100% | 113s | 33% | 20 / 48 | 40 |

Money spread 0.55 · leader at 2:00 wins 46% · lead changes 8.1 · trend shifts recovered 100% (avg 3s) · report delay 8.6s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.21 (typical minute 1.33) · takeouts/game 0.0

### gradual 20s + k=0.25 + share 10–45% · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 27% | 2.45 | 468 | 25% | 3.7 | 100% | 79s | 56% | 64 / 25 | 66 |
| hybrid | 29% | 2.23 | 486 | 26% | 3.6 | 100% | 73s | 66% | 65 / 23 | 66 |
| hawk | 15% | 3.10 | 400 | 23% | 4.1 | 100% | 112s | 35% | 21 / 47 | 41 |

Money spread 0.47 · leader at 2:00 wins 41% · lead changes 9.2 · trend shifts recovered 100% (avg 3s) · report delay 8.6s · ideal moved 0.23 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 0.99 (typical minute 1.11) · takeouts/game 0.0
