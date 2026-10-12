# Prototype client

You vs 3 bots in the browser. The whole match runs in the tab (no server yet).

```sh
npm install        # from the repo root
npm run dev        # then open the URL it prints (usually http://localhost:5173)
```

- **Recipe:** adjust with the buttons or sliders, then **Apply** (Enter). Esc resets the draft.
- **Waiters:** click a table to send your first free waiter. It reports when that diner finishes,
  then walks home.
- **P** pauses, **`** opens the debug panel (seats, magnitude A/B/C, arrival rate, seed,
  reveal the ideal). The speed menu is in the top bar.
- After a match, **Download match log** saves a JSON file with everything needed to compare
  your play against the bots (reports, tips, recipes over time, your actions).
- In the browser console, `bop.session.game` is the live game.
