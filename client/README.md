# Prototype client

Play against bots, or with friends over the internet. There's no game server: in multiplayer,
the host's browser tab runs the game and everyone else connects to it directly.

**Live build:** https://avparmar.github.io/Bored-of-Pizza/ (deployed automatically by
`.github/workflows/pages.yml` on every push to `main` or `sim`).

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
- In the browser console, `bop.session` is the live match (`bop.session.game` when it runs in this tab).

## Multiplayer

1. One person clicks **Host a game with friends**, enters a name, and gets a 4-letter room code
   plus an invite link.
2. Friends open the link (or click **Join a game** and type the code). Up to 3 can join; bots
   fill any empty shops. Bot types and rules come from the host's ⚙ panel.
3. The host clicks **Start game**. Everyone gets the 20s blind pick; doors open when every
   player has pressed Ready (or the timer runs out).

Things to know:
- **The host must keep their tab open** until the game ends; it is running everyone's game.
  It keeps running in a background tab, but closing it ends the game for everyone.
- If a guest leaves or loses connection (no contact for 10s), a bot takes over their shop.
- Speed is fixed at 1× in multiplayer; the host can still pause (P).
- Browsers find each other through the free public PeerJS server, then talk directly
  (WebRTC). That works on most home networks. Some strict networks (corporate, some mobile
  carriers) block direct connections; if a friend can't join, that's the likely cause, and a
  relay (TURN) server would fix it.
- The host's tab knows the hidden ideal recipe, so a host *could* peek with dev tools. Fine
  among friends.
- To test locally without the internet: run a PeerJS server (`npx peerjs --port 9000`, or see
  `peer` in devDependencies) and add `?peerHost=127.0.0.1&peerPort=9000&peerPath=/` to the URL.

