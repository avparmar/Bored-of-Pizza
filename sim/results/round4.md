# Simulation results: Round 4: faster flow

Generated 2026-10-13 01:23 UTC · 200 games per batch.

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
  "shareFloor": 0.1,
  "shareCap": 1,
  "queuePenalty": 0.15,
  "arrivalMeanSec": 1.2,
  "serviceSec": 1.5,
  "eatSec": 6,
  "courtSize": 20,
  "customerSpeed": 2.5,
  "waiterSpeed": 4,
  "tableGrid": 4,
  "waitersPerPlayer": 2,
  "waiterAutoReturn": true,
  "waiterIdleReturnSec": 3,
  "customerWalkIn": true,
  "autoFollow": false,
  "reportVerdict": false,
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

## 1. Faster flow

_Old flow (eat 4.5s, a customer every 1.5s, waiter speed 3, no floor) vs new defaults (eat 6s, every 1.2s, waiter speed 4, 10% floor)._

### old flow · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 30% | 2.37 | 374 | 25% | 3.8 | 100% | 77s | 63% | 64 / 25 | 65 |
| hybrid | 30% | 2.23 | 392 | 26% | 3.6 | 100% | 71s | 70% | 65 / 24 | 65 |
| hawk | 11% | 3.18 | 299 | 23% | 4.2 | 100% | 114s | 34% | 20 / 48 | 40 |

Money spread 0.61 · leader at 2:00 wins 49% · lead changes 7.1 · trend shifts recovered 99% (avg 48s) · report delay 8.6s · ideal moved 0.24 pts by delivery · direction already wrong 7% · diners watched by a waiter 73% · income gap after shifts 1.27 (typical minute 1.38) · takeouts/game 0.0

### new flow (defaults) · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 32% | 2.34 | 485 | 25% | 3.7 | 100% | 73s | 67% | 84 / 26 | 68 |
| hybrid | 27% | 2.28 | 496 | 26% | 3.6 | 100% | 68s | 71% | 87 / 25 | 69 |
| hawk | 15% | 3.10 | 398 | 23% | 4.0 | 100% | 95s | 45% | 17 / 63 | 44 |

Money spread 0.55 · leader at 2:00 wins 48% · lead changes 7.8 · trend shifts recovered 100% (avg 47s) · report delay 10.1s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 73% · income gap after shifts 1.18 (typical minute 1.28) · takeouts/game 0.4

### new flow, superhuman bots · superhuman bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 27% | 2.60 | 496 | 25% | 3.5 | 100% | 66s | 83% | 57 / 47 | 91 |
| hybrid | 27% | 2.29 | 519 | 26% | 3.4 | 100% | 66s | 81% | 59 / 45 | 72 |
| hawk | 21% | 2.81 | 457 | 24% | 3.7 | 100% | 75s | 59% | 31 / 67 | 50 |

Money spread 0.51 · leader at 2:00 wins 37% · lead changes 8.3 · trend shifts recovered 100% (avg 41s) · report delay 10.1s · ideal moved 0.28 pts by delivery · direction already wrong 9% · diners watched by a waiter 72% · income gap after shifts 1.15 (typical minute 1.24) · takeouts/game 0.4

## 2. Gentler tips on the new flow

_Does k=0.25 still narrow the spread with the new flow?_

### k=0.35 (current) · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 32% | 2.34 | 485 | 25% | 3.7 | 100% | 73s | 67% | 84 / 26 | 68 |
| hybrid | 27% | 2.28 | 496 | 26% | 3.6 | 100% | 68s | 71% | 87 / 25 | 69 |
| hawk | 15% | 3.10 | 398 | 23% | 4.0 | 100% | 95s | 45% | 17 / 63 | 44 |

Money spread 0.55 · leader at 2:00 wins 48% · lead changes 7.8 · trend shifts recovered 100% (avg 47s) · report delay 10.1s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 73% · income gap after shifts 1.18 (typical minute 1.28) · takeouts/game 0.4

### k=0.25 · human bots

Lineup: analyst, hybrid, hawk, hybrid · 200 games, seats rotated

| Strategy | Win rate | Avg rank | Avg $ | Customer share | Avg distance | Got close | Time to close | Ever exact | Reports (own / rival) | Recipe changes |
|---|---|---|---|---|---|---|---|---|---|---|
| analyst | 34% | 2.23 | 616 | 26% | 3.6 | 100% | 71s | 71% | 87 / 26 | 69 |
| hybrid | 30% | 2.25 | 613 | 26% | 3.6 | 100% | 68s | 63% | 88 / 24 | 69 |
| hawk | 8% | 3.27 | 501 | 23% | 4.1 | 100% | 102s | 39% | 17 / 62 | 43 |

Money spread 0.44 · leader at 2:00 wins 49% · lead changes 8.9 · trend shifts recovered 99% (avg 45s) · report delay 10.1s · ideal moved 0.28 pts by delivery · direction already wrong 8% · diners watched by a waiter 72% · income gap after shifts 0.98 (typical minute 1.07) · takeouts/game 0.5
