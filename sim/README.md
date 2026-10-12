# Headless simulation

Runs Bored of Pizza games with bots, with no graphics, to tune the numbers in
`core/src/config.ts` before building the real client.

```sh
npm install
npm test                      # unit tests for the rules
npm run experiments -- round2        # suite → sim/results/round2.md (~1.5 min)
npm run experiments -- round2 50     # quicker, 50 games per batch
npm run experiments -- round1        # the original suite, with its settings pinned

# One custom batch: any Config key can be overridden with --set
npm run sim -- --games 200 --lineup searcher,hybrid,hawk,copycat --set magnitude=own --set eatSec=5
```

## Bots

| Bot | Recipe | Waiters |
|---|---|---|
| `static` | Random recipe (plus its starting intel), never changes | Idle |
| `searcher` | Narrows each ingredient from intel about its **own** pizza only | Its own customers |
| `copycat` | No intel; copies whoever earned the most in the last 30s | Idle |
| `hybrid` | Narrows from **all** intel; jumps to a rival's recipe if they earn 30% more | Own customers first, then anyone's |
| `hawk` | Narrows from all intel | The current leader's customers first |
| `analyst` | Narrows from all intel, and also "does the math": each shop's tip per pizza (public money ÷ customers served) gives its rough distance from the ideal, so it searches for the ideal that best fits all four public recipes | Own customers first, then anyone's |

Bots are deliberately simple. A mechanic that looks fine against them may still break
against a clever human, so treat results as directional.

## How it models the game

- Time runs in 0.1s ticks; bots decide once per second.
- Movement is straight-line timing on a 20×20 court (restaurants in corners, 4×4 tables in
  the middle), not real pathfinding.
- One waiter per table: the first to arrive claims it; a later arrival is turned away.
- A customer's taste is locked when their order starts; tips and reports use that snapshot.
