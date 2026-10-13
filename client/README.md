# Prototype client

You vs 3 bots in the browser. The whole match runs in the tab (no server yet).

```sh
npm install        # from the repo root
npm run dev        # then open the URL it prints (usually http://localhost:5173)
```

- **Recipe:** adjust with the buttons, sliders or keys, then **Apply** (Space or Enter). Esc resets the
  draft. Keys: **Q/A** dough, **W/S** sauce, **E/D** cheese, **R/F** toppings (hold Shift for ±5);
  **1/2/3** copy a rival's recipe into your draft. Rivals' current values show as coloured ticks
  under each slider.
- **Blind pick:** 20s to set an opening recipe while rivals' are hidden (Ready button, or Space with no unapplied changes).
- **Waiters:** click one of *your* customers and a waiter follows them to their table; click any
  table to send a waiter there (if all are busy, one heading to an empty table is re-sent).
  Right-click a waiter, or a table one is headed to, to call it home.
- **Reading the game:** recipes are printed on each shop and in the Recipes board (▲▼ vs yours);
  your tips and reports pop up at the table they came from; the latest three reports sit under
  the court.
- **P** pauses, **`** opens the debug panel (seats, bot skill, magnitude A/B/C, tip steepness,
  share floor/cap, trend-shift style, auto-follow, diner verdicts, arrival rate, seed, reveal
  the ideal). The speed menu is in the top bar.
- After a match, **Download match log** saves a JSON file with everything needed to compare
  your play against the bots (reports, tips, recipes over time, your actions).
- In the browser console, `bop.session.game` is the live game.
