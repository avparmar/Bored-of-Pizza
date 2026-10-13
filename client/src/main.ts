import { INGREDIENTS, type GameEvent, type MagnitudeMode, type Observation, type Recipe, type Report } from '@bop/core';
import { STRATEGIES, type BotSkill } from '@bop/sim';
import { CourtRenderer, SHOP_COLORS, SHOP_NAMES, SHORT } from './render.js';
import { Session, type Seat } from './session.js';
import { showEnd } from './endscreen.js';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ENDS: [string, string][] = [
  ['thin crust', 'thick crust'],
  ['light sauce', 'heavy sauce'],
  ['light cheese', 'extra cheese'],
  ['more meat', 'more veggies'],
];
const NAMES = INGREDIENTS.map((n) => n[0].toUpperCase() + n.slice(1));
/** [raise, lower] key per ingredient. */
const KEYS: [string, string][] = [
  ['q', 'a'],
  ['w', 's'],
  ['e', 'd'],
  ['r', 'f'],
];
const SEAT_OPTIONS: Seat[] = ['human', ...(Object.keys(STRATEGIES) as Seat[])];

// ------------------------------------------------------------------ settings

const settings = {
  seats: ['human', 'hybrid', 'analyst', 'hawk'] as Seat[],
  magnitude: 'none' as MagnitudeMode,
  arrivalMeanSec: 1.2,
  seed: Math.floor(Math.random() * 1e6),
  reveal: false,
  skill: 'human' as BotSkill,
  tipK: 0.35,
  shareFloor: 0.1,
  shareCap: 1,
  shiftIngredients: 2,
  shiftRamp: 0,
  autoFollow: false,
  verdict: false,
  bag: true,
  headlineNames: 'all' as 'all' | 'one' | 'none',
};

// ------------------------------------------------------------------ state

const canvas = $<HTMLCanvasElement>('court');
const renderer = new CourtRenderer(canvas);
let session: Session | null = null;
let draft: Recipe = [11, 11, 11, 11];
let lastUi = 0;
let lastFrame = performance.now();
let latestIds: number[] = [];
/** Your recent tips, for the tip meter and the new-player nudge. */
let myTips: { t: number; amount: number }[] = [];
/** Public money/served once a second, to estimate rivals' tip per customer. */
let publicHist: { t: number; money: number[]; served: number[] }[] = [];
let nudgeShown = false;
let recipeChangedAt: number[] = [];
let trendFlash: { ingredients: number[]; until: number } | null = null;
let bannerTimer: number | undefined;

// ------------------------------------------------------------------ start / restart

function start(seats: Seat[]) {
  settings.seats = seats;
  session = new Session({
    seats,
    skill: settings.skill,
    overrides: {
      seed: settings.seed,
      magnitude: settings.magnitude,
      arrivalMeanSec: settings.arrivalMeanSec,
      tipK: settings.tipK,
      shareFloor: settings.shareFloor,
      shareCap: settings.shareCap,
      trendShiftIngredients: settings.shiftIngredients,
      trendShiftRampSec: settings.shiftRamp,
      autoFollow: settings.autoFollow,
      reportVerdict: settings.verdict,
      reportBag: settings.bag,
      headlineNames: settings.headlineNames,
    },
  });
  if (session.human === null) session.ready(); // spectators skip the blind pick
  session.speed = Number($<HTMLSelectElement>('speed').value);
  const obs = session.game.observe(session.human ?? 0);
  draft = [...obs.recipes[session.human ?? 0]] as Recipe;
  buildRecipeRows();
  $('intel-latest').innerHTML = '';
  $('intel-history').innerHTML = '';
  latestIds = [];
  myTips = [];
  publicHist = [];
  nudgeShown = false;
  recipeChangedAt = [-99, -99, -99, -99];
  trendFlash = null;
  $('nudge').classList.add('hidden');
  $('trend-banner').classList.add('hidden');
  $('tip-meter').innerHTML = '';
  $('headline').textContent = human0(seats) ? 'Blind pick: choose your opening recipe.' : 'Doors open!';
  const human = session.human !== null;
  $('recipe-panel').classList.toggle('hidden', !human);
  $('intel-panel').classList.toggle('hidden', !human);
  $('intel-strip').classList.toggle('hidden', !human);
  const tip = obs.startingIntel;
  $('tipoff').innerHTML = tip
    ? `🕵️ <b>Your tip-off:</b> at opening, customers want <b>${NAMES[tip.ingredient]} ${tip.value}</b>. Nobody else knows this one, and tastes drift.`
    : '';
  $('overlay').innerHTML = '';
  renderer.resize(obs.cfg.courtSize);
}

function human0(seats: Seat[]) {
  return seats.includes('human');
}

function newSeed() {
  settings.seed = Math.floor(Math.random() * 1e6);
  $<HTMLInputElement>('dbg-seed').value = String(settings.seed);
  $<HTMLInputElement>('dbg-autofollow').checked = settings.autoFollow;
  $<HTMLInputElement>('dbg-verdict').checked = settings.verdict;
  $<HTMLInputElement>('dbg-bag').checked = settings.bag;
  $<HTMLSelectElement>('dbg-headline').value = settings.headlineNames;
}

function showStart() {
  $('overlay').innerHTML = `
    <div class="card">
      <h1>🍕 Bored of Pizza <small style="font-size:14px;color:#8a7a68">prototype</small></h1>
      <p>You run the <b style="color:${SHOP_COLORS[0]}">red</b> pizzeria in a mall food court.
      Pizzas sell at cost, so you earn only from <b>tips</b>, and customers tip more the closer your
      pizza is to today's taste. Nobody knows exactly what that taste is, and it keeps changing.</p>
      <ul>
        <li><b>Tune your recipe</b> on the right, then press <b>Apply</b> (Space or Enter). Every shop's recipe is public.
        Keys: <b>Q/A</b> dough, <b>W/S</b> sauce, <b>E/D</b> cheese, <b>R/F</b> toppings (Shift = ±5);
        <b>1/2/3</b> copy a rival's recipe into your draft.</li>
        <li>First, a 20-second <b>blind pick</b>: choose your opening recipe while everyone else's is hidden.</li>
        <li><b>Click one of your customers</b> (in line or carrying your pizza) and a waiter follows them to
        their table. Or <b>click any table</b> to send a waiter there, including to spy on rivals' diners.
        When the diner finishes, the waiter reports whether one ingredient should go <b>up</b> or <b>down</b>.
        <b>Right-click</b> a waiter (or their table) to call them home.</li>
        <li>Your tips pop up over the table where the diner ate: a big tip means you're close.</li>
        <li>Better pizza brings more customers. Watch the headlines for big trend shifts.</li>
        <li>Most money after 10 minutes wins.</li>
      </ul>
      <div class="buttons">
        <button class="primary" id="go-play">Play vs 3 bots</button>
        <button id="go-spectate">Watch 4 bots</button>
      </div>
    </div>`;
  $('go-play').onclick = () => {
    newSeed();
    start(settings.seats.includes('human') ? settings.seats : ['human', 'hybrid', 'analyst', 'hawk']);
  };
  $('go-spectate').onclick = () => {
    newSeed();
    start(['hybrid', 'analyst', 'hawk', 'searcher']);
  };
}

// ------------------------------------------------------------------ recipe panel

function buildRecipeRows() {
  const rows = $('recipe-rows');
  rows.innerHTML = '';
  const scale = session!.game.cfg.scale;
  NAMES.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'recipe-row';
    row.innerHTML = `
      <span class="name">${name} <kbd class="keys">${KEYS[i][0].toUpperCase()}/${KEYS[i][1].toUpperCase()}</kbd></span>
      <div class="stepper">
        <button data-d="-5">−5</button><button data-d="-1">−1</button>
        <span class="val" id="val-${i}"></span>
        <button data-d="1">+1</button><button data-d="5">+5</button>
        <span class="now" id="now-${i}"></span>
      </div>
      <div class="track-wrap">
        <input type="range" min="1" max="${scale}" step="1" id="rng-${i}" />
        <div class="markers" id="mk-${i}"></div>
      </div>
      <div class="ends"><span>${ENDS[i][0]}</span><span>${ENDS[i][1]}</span></div>`;
    rows.appendChild(row);
    row.querySelectorAll<HTMLButtonElement>('button[data-d]').forEach((b) => {
      b.onclick = () => setDraft(i, draft[i] + Number(b.dataset.d));
    });
    $<HTMLInputElement>(`rng-${i}`).oninput = (e) => setDraft(i, Number((e.target as HTMLInputElement).value));
  });
  refreshRecipe();
}

function setDraft(i: number, v: number) {
  const scale = session!.game.cfg.scale;
  draft[i] = Math.max(1, Math.min(scale, Math.round(v)));
  refreshRecipe();
}

function currentRecipe(): Recipe {
  return session!.game.recipes[session!.human ?? 0];
}

function refreshRecipe() {
  if (!session || session.human === null) return;
  const cur = currentRecipe();
  let dirty = false;
  for (let i = 0; i < 4; i++) {
    const v = $(`val-${i}`);
    v.textContent = String(draft[i]);
    v.classList.toggle('changed', draft[i] !== cur[i]);
    $(`now-${i}`).textContent = draft[i] !== cur[i] ? `now ${cur[i]}` : '';
    $<HTMLInputElement>(`rng-${i}`).value = String(draft[i]);
    if (draft[i] !== cur[i]) dirty = true;
  }
  // Rivals' current values as coloured ticks on each slider.
  const obs = session.game.observe(session.human);
  const scale = session.game.cfg.scale;
  for (let i = 0; i < 4; i++) {
    const hidden = obs.phase === 'pregame';
    // One tick per value; rivals sharing a value stack their colours side by side.
    const byValue = new Map<number, number[]>();
    obs.recipes.forEach((r, p) => {
      if (p === session!.human) return;
      byValue.set(r[i], [...(byValue.get(r[i]) ?? []), p]);
    });
    $(`mk-${i}`).innerHTML = hidden
      ? ''
      : [...byValue]
          .map(
            ([v, ps]) =>
              `<span class="mk" title="${ps.map((p) => SHOP_NAMES[p]).join(', ')}: ${v}" style="left:${((v - 1) / (scale - 1)) * 100}%">${ps
                .map((p) => `<b style="background:${SHOP_COLORS[p]}"></b>`)
                .join('')}<i>${v}</i></span>`,
          )
          .join('');
  }
  $<HTMLButtonElement>('btn-apply').disabled = !dirty;
  $<HTMLButtonElement>('btn-reset').disabled = !dirty;
  $('recipe-status').textContent = dirty ? 'unsaved' : '';
}

function applyDraft() {
  if (!session || session.human === null) return;
  session.act({ type: 'setRecipe', recipe: [...draft] as Recipe });
  refreshRecipe();
}

function resetDraft() {
  if (!session || session.human === null) return;
  draft = [...currentRecipe()] as Recipe;
  refreshRecipe();
}

$('btn-apply').onclick = applyDraft;
$('btn-reset').onclick = resetDraft;

// ------------------------------------------------------------------ intel feed

function reportHtml(r: Report, me: number, t: number) {
  const ing = NAMES[r.ingredient];
  const mag = r.magnitude ? ` (${{ little: 'a little', lot: 'a lot', way: 'way off' }[r.magnitude]})` : '';
  const verdict =
    r.direction === 'right'
      ? `✓ ${ing} just right`
      : r.direction === 'higher'
        ? `▲ ${ing}: more${mag}`
        : `▼ ${ing}: less${mag}`;
  const whose = r.about === me ? 'your pizza' : `<span style="color:${SHOP_COLORS[r.about]};font-weight:700">${SHOP_NAMES[r.about]}</span>'s pizza`;
  const recipe = r.recipe
    .map((v, i) => (i === r.ingredient ? `<b><u>${SHORT[i]}${v}</u></b>` : `${SHORT[i]}${v}`))
    .join(' ');
  const src = r.source === 'card' ? '💬 comment card' : '🧑‍🍳 waiter';
  const thumbs = r.verdict ? ` <span title="diner's verdict">${{ good: '👍', ok: '😐', bad: '👎' }[r.verdict]}</span>` : '';
  return `<div class="verdict ${r.direction}">${verdict}${thumbs}</div>
    <div class="recipe">${recipe}</div>
    <div class="meta">${whose} · ${src} · ordered ${Math.round(t - r.orderedAt)}s ago</div>`;
}

function refreshIntel(obs: Observation) {
  const mine = obs.reports;
  const latest = mine.slice(-3).reverse();
  const ids = latest.map((r) => r.id);
  $('intel-latest').innerHTML = latest
    .map(
      (r) =>
        `<div class="report ${latestIds.includes(r.id) ? '' : 'new'}" style="border-left-color:${SHOP_COLORS[r.about]}">${reportHtml(r, obs.me, obs.t)}</div>`,
    )
    .join('') || '<div class="empty">No reports yet. Click one of your customers (or any table with a diner) to send a waiter.</div>';
  latestIds = ids;
  $('intel-count').textContent = String(mine.length);
  $('intel-rate').textContent = obs.t > 30 ? `${(mine.length / (obs.t / 60)).toFixed(1)}/min` : '';
}

function addHistory(r: Report, me: number, t: number) {
  const li = document.createElement('li');
  li.className = 'report';
  li.style.borderLeftColor = SHOP_COLORS[r.about];
  li.innerHTML = reportHtml(r, me, t).replace(/ordered \d+s ago/, `at ${fmtClock(r.deliveredAt, false)}`);
  $('intel-history').prepend(li);
}

// ------------------------------------------------------------------ recipe board, tip meter, nudge

function refreshRecipeBoard(obs: Observation) {
  const s = session!;
  const me = s.human ?? 0;
  const mine = obs.recipes[me];
  const hidden = obs.phase === 'pregame';
  const order = [me, ...[0, 1, 2, 3].filter((p) => p !== me && p < obs.recipes.length)];
  const head = `<tr><th></th>${SHORT.map(
    (x, i) => `<th class="${trendFlash && trendFlash.ingredients.includes(i) && obs.t < trendFlash.until ? 'flash' : ''}">${x}</th>`,
  ).join('')}</tr>`;
  const rows = order
    .map((p) => {
      const isMe = p === s.human;
      const name = isMe ? 'You' : SHOP_NAMES[p];
      const changed = obs.t - recipeChangedAt[p] < 1.5 ? 'changed' : '';
      const cells = obs.recipes[p]
        .map((v, i) => {
          if (hidden && !isMe) return '<td>?</td>';
          if (isMe || s.human === null) return `<td>${v}</td>`;
          const cmp = v > mine[i] ? '<span class="up">▲</span>' : v < mine[i] ? '<span class="down">▼</span>' : '<span class="same">=</span>';
          return `<td>${v}${cmp}</td>`;
        })
        .join('');
      return `<tr class="${isMe ? 'me' : ''} ${changed}"><td class="name"><span class="swatch" style="background:${SHOP_COLORS[p]}"></span> ${name}</td>${cells}</tr>`;
    })
    .join('');
  $('board').innerHTML = head + rows;
}

function avg(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function refreshTipMeter(obs: Observation) {
  if (myTips.length === 0) {
    $('tip-meter').innerHTML = obs.phase === 'open' ? 'Your tips: <b>—</b> (waiting for your first diner)' : '';
    return;
  }
  const last = myTips.slice(-5).map((x) => x.amount);
  const prev = myTips.slice(-10, -5).map((x) => x.amount);
  const a = avg(last);
  const trend = prev.length >= 3 ? (a > avg(prev) * 1.15 ? ' ▲' : a < avg(prev) * 0.85 ? ' ▼' : '') : '';
  const color = a >= 6 ? '#1B6E2F' : a >= 3 ? '#A9820A' : '#C62828';
  $('tip-meter').innerHTML = `Your tips (last ${last.length}): <b style="color:${color}">$${a.toFixed(2)}${trend}</b> <span style="color:#8a7a68">of $10 max</span>`;
}

/** One-time hint if rivals earn much more per customer than you: their recipes are closer. */
function checkNudge(obs: Observation) {
  const s = session!;
  if (nudgeShown || s.human === null || obs.t < 60) return;
  const then = publicHist.find((h) => h.t >= obs.t - 30);
  const now = publicHist[publicHist.length - 1];
  if (!then || !now || now.t - then.t < 20) return;
  const mineRecent = myTips.filter((x) => x.t >= obs.t - 30).map((x) => x.amount);
  if (mineRecent.length < 2) return;
  let best = 0;
  for (let p = 0; p < now.money.length; p++) {
    if (p === s.human) continue;
    const ds = now.served[p] - then.served[p];
    if (ds >= 3) best = Math.max(best, (now.money[p] - then.money[p]) / ds);
  }
  if (best > 0 && avg(mineRecent) < best * 0.5) {
    nudgeShown = true;
    const n = $('nudge');
    n.innerHTML = '💡 Rivals are earning much more per customer than you. Their recipes are probably closer to today\'s taste. Compare them on the recipe board.';
    n.classList.remove('hidden');
    window.setTimeout(() => n.classList.add('hidden'), 9000);
  }
}

// ------------------------------------------------------------------ leaderboard, clock

function refreshPregame(obs: Observation) {
  const pre = obs.phase === 'pregame' && session!.human !== null;
  $('pregame').classList.toggle('hidden', !pre);
  if (pre) {
    $('pregame-left').textContent = String(Math.ceil(obs.pregameLeft));
    $('clock').textContent = `🔒 ${Math.ceil(obs.pregameLeft)}`;
  } else if ($('headline').textContent?.startsWith('Blind pick')) {
    $('headline').textContent = 'Doors open! Customers are arriving.';
  }
}

function fmtClock(t: number, remaining = true) {
  const total = session?.game.cfg.durationSec ?? 600;
  const s = Math.max(0, Math.ceil(remaining ? total - t : t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function refreshBoard(obs: Observation) {
  const s = session!;
  const order = obs.money.map((m, i) => ({ m, i })).sort((a, b) => b.m - a.m);
  $('leaderboard').innerHTML = order
    .map(({ m, i }) => {
      const me = i === s.human;
      const label = me ? 'You' : s.human === null ? `${SHOP_NAMES[i]} <span class="served">(${s.seats[i]})</span>` : SHOP_NAMES[i];
      return `<li class="${me ? 'me' : ''}"><span class="swatch" style="background:${SHOP_COLORS[i]}"></span>
        <span>${label}</span><span class="served">${obs.served[i]} served</span><span class="money">$${m.toFixed(0)}</span></li>`;
    })
    .join('');
  $('clock').textContent = fmtClock(obs.t);
}

// ------------------------------------------------------------------ events

function handleEvents(evs: GameEvent[], obs: Observation) {
  const s = session!;
  for (const e of evs) {
    if (e.type === 'tip' && s.human !== null) {
      myTips.push({ t: e.t, amount: e.amount });
      // Pop up where the diner ate, which is where you're already looking.
      const at = e.table !== null ? obs.tables[e.table].pos : obs.doorPos[s.human];
      const color = e.amount >= 6 ? '#1B6E2F' : e.amount >= 3 ? '#A9820A' : '#C62828';
      renderer.popup(`+$${e.amount.toFixed(2)}`, { x: at.x, y: at.y - 0.4 }, color, obs.t, 1.8, 0.75);
    } else if (e.type === 'headline') {
      const names = e.ingredients.map((i) => INGREDIENTS[i].toUpperCase());
      const name = names.length ? names.join(' & ') : 'TASTES ARE CHANGING';
      const h = $('headline');
      h.textContent = names.length
        ? `📰 TREND ALERT! Everyone's suddenly talking about ${name}…`
        : `📰 TREND ALERT! Something new is in fashion… but what?`;
      h.classList.remove('flash');
      void h.offsetWidth;
      h.classList.add('flash');
      trendFlash = { ingredients: e.ingredients, until: obs.t + 20 };
      const b = $('trend-banner');
      b.innerHTML = `📰 TREND ALERT: ${name}!<small>Tastes just shifted. Your recipe may be way off now.</small>`;
      b.classList.remove('hidden');
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => b.classList.add('hidden'), 4000);
    } else if (e.type === 'recipe') {
      recipeChangedAt[e.restaurant] = obs.t;
      if (e.restaurant !== s.human && obs.t > 0.5) {
        const p = obs.restaurantPos[e.restaurant];
        renderer.popup('new recipe', { x: p.x, y: p.y + (p.y < 10 ? 3 : -3) }, SHOP_COLORS[e.restaurant], obs.t);
      }
    } else if (e.type === 'report' && s.human !== null) {
      addHistory(e.report, s.human, obs.t);
      const r = e.report;
      if (r.table !== null) {
        const arrow = r.direction === 'higher' ? '▲' : r.direction === 'lower' ? '▼' : '✓';
        const color = r.direction === 'higher' ? '#1E88E5' : r.direction === 'lower' ? '#E53935' : '#2EAD4B';
        const text = `${r.source === 'card' ? '💬 ' : ''}${SHORT[r.ingredient]}${arrow}`;
        const p = obs.tables[r.table].pos;
        renderer.popup(text, { x: p.x, y: p.y + 0.9 }, color, obs.t, 2.6, 0.9);
      }
    } else if (e.type === 'blocked' && s.human !== null) {
      renderer.popup('Taken!', obs.tables[e.table].pos, '#C62828', obs.t);
    }
  }
}

// ------------------------------------------------------------------ main loop

function frame(now: number) {
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (session) {
    const evs = session.update(dt);
    const viewer = session.human ?? 0;
    const obs = session.game.observe(viewer);
    handleEvents(evs, obs);
    renderer.draw(obs, session.renderTime, session.human, settings.reveal ? session.game.ideal : null);
    if (now - lastUi > 200) {
      lastUi = now;
      refreshBoard(obs);
      refreshPregame(obs);
      refreshRecipeBoard(obs);
      if (publicHist.length === 0 || obs.t - publicHist[publicHist.length - 1].t >= 1) {
        publicHist.push({ t: obs.t, money: [...obs.money], served: [...obs.served] });
        if (publicHist.length > 90) publicHist.shift();
      }
      if (session.human !== null) {
        refreshIntel(obs);
        refreshRecipe();
        refreshTipMeter(obs);
        checkNudge(obs);
      }
    }
    if (session.done && !$('overlay').innerHTML) {
      showEnd(session, {
        again: () => {
          newSeed();
          start(settings.seats);
        },
        menu: showStart,
      });
    }
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ input

canvas.addEventListener('mousemove', (e) => {
  if (!session || session.human === null) return;
  const obs = session.game.observe(session.human);
  // Your own customers take priority over tables under the cursor.
  renderer.hoverCustomer = renderer.customerAt(e.offsetX, e.offsetY, session.human);
  renderer.hoverTable = renderer.hoverCustomer === null ? renderer.tableAt(obs, e.offsetX, e.offsetY) : null;
  canvas.style.cursor = renderer.hoverTable !== null || renderer.hoverCustomer !== null ? 'pointer' : 'default';
});
canvas.addEventListener('mouseleave', () => {
  renderer.hoverTable = null;
  renderer.hoverCustomer = null;
});
canvas.addEventListener('click', (e) => {
  if (!session || session.human === null) return;
  const cust = renderer.customerAt(e.offsetX, e.offsetY, session.human);
  if (cust !== null) {
    session.act({ type: 'followCustomer', customer: cust });
    return;
  }
  const obs = session.game.observe(session.human);
  const tb = renderer.tableAt(obs, e.offsetX, e.offsetY);
  if (tb !== null) session.act({ type: 'sendWaiter', table: tb });
});
// Right-click a waiter (or a table one of your waiters is headed to) to call them home.
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!session || session.human === null) return;
  let idx = renderer.waiterAt(e.offsetX, e.offsetY);
  if (idx === null) {
    const obs = session.game.observe(session.human);
    const tb = renderer.tableAt(obs, e.offsetX, e.offsetY);
    const w = obs.myWaiters.find((x) => tb !== null && x.target === tb);
    if (w) idx = w.idx;
  }
  if (idx !== null) session.act({ type: 'recallWaiter', idx });
});
$('btn-ready').onclick = () => session?.ready();

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
  if (e.target instanceof HTMLSelectElement) return;
  const k = e.key.toLowerCase();
  const up = KEYS.findIndex(([u]) => u === k);
  const down = KEYS.findIndex(([, d]) => d === k);
  if (session && session.human !== null && (up >= 0 || down >= 0) && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    const step = e.shiftKey ? 5 : 1;
    if (up >= 0) setDraft(up, draft[up] + step);
    else setDraft(down, draft[down] - step);
    return;
  }
  if (session && session.human !== null && ['1', '2', '3'].includes(e.key) && !e.shiftKey) {
    // Copy a rival's recipe into the draft (not applied until Enter).
    const rivals = [0, 1, 2, 3].filter((p) => p !== session!.human);
    const p = rivals[Number(e.key) - 1];
    if (p !== undefined && session.game.phase === 'open') {
      draft = [...session.game.recipes[p]] as Recipe;
      refreshRecipe();
    }
    return;
  }
  if (e.key === 'Enter') applyDraft();
  else if (e.key === ' ') {
    // Space applies the draft (it sits right under the ingredient keys). During the blind
    // pick, Space with nothing left to apply means Ready.
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (!session || session.human === null) return;
    const dirty = draft.some((v, i) => v !== currentRecipe()[i]);
    if (dirty) applyDraft();
    else if (session.game.phase === 'pregame') session.ready();
  } else if (e.key === 'Escape') resetDraft();
  else if (e.key === 'p' || e.key === 'P') togglePause();
  else if (e.key === '`') toggleDebug();
});

function togglePause() {
  if (!session) return;
  session.paused = !session.paused;
  $('btn-pause').textContent = session.paused ? '▶' : '⏸';
}
$('btn-pause').onclick = togglePause;
$<HTMLSelectElement>('speed').onchange = (e) => {
  if (session) session.speed = Number((e.target as HTMLSelectElement).value);
};
window.addEventListener('resize', () => session && renderer.resize(session.game.cfg.courtSize));

// ------------------------------------------------------------------ debug panel

function toggleDebug() {
  $('debug').classList.toggle('hidden');
  const sel = $('seat-selects');
  sel.innerHTML = settings.seats
    .map(
      (s, i) =>
        `<select data-seat="${i}" style="border-left:6px solid ${SHOP_COLORS[i]}">${SEAT_OPTIONS.map(
          (o) => `<option ${o === s ? 'selected' : ''}>${o}</option>`,
        ).join('')}</select>`,
    )
    .join('');
  $<HTMLSelectElement>('dbg-magnitude').value = settings.magnitude;
  $<HTMLInputElement>('dbg-arrival').value = String(settings.arrivalMeanSec);
  $<HTMLSelectElement>('dbg-skill').value = settings.skill;
  $<HTMLInputElement>('dbg-tipk').value = String(settings.tipK);
  $<HTMLInputElement>('dbg-floor').value = String(settings.shareFloor);
  $<HTMLInputElement>('dbg-cap').value = String(settings.shareCap);
  $<HTMLInputElement>('dbg-shift-n').value = String(settings.shiftIngredients);
  $<HTMLInputElement>('dbg-ramp').value = String(settings.shiftRamp);
  $<HTMLInputElement>('dbg-seed').value = String(settings.seed);
  $<HTMLInputElement>('dbg-autofollow').checked = settings.autoFollow;
  $<HTMLInputElement>('dbg-verdict').checked = settings.verdict;
  $<HTMLInputElement>('dbg-bag').checked = settings.bag;
  $<HTMLSelectElement>('dbg-headline').value = settings.headlineNames;
}
$('btn-debug').onclick = toggleDebug;
$('dbg-close').onclick = () => $('debug').classList.add('hidden');
$<HTMLInputElement>('dbg-reveal').onchange = (e) => (settings.reveal = (e.target as HTMLInputElement).checked);
$('dbg-restart').onclick = () => {
  const seats = [...document.querySelectorAll<HTMLSelectElement>('#seat-selects select')].map((s) => s.value as Seat);
  // Only one human seat for now: extra ones become bots.
  const firstHuman = seats.indexOf('human');
  seats.forEach((s, i) => {
    if (s === 'human' && i !== firstHuman) seats[i] = 'hybrid';
  });
  settings.magnitude = $<HTMLSelectElement>('dbg-magnitude').value as MagnitudeMode;
  settings.arrivalMeanSec = Number($<HTMLInputElement>('dbg-arrival').value) || 1.2;
  settings.autoFollow = $<HTMLInputElement>('dbg-autofollow').checked;
  settings.verdict = $<HTMLInputElement>('dbg-verdict').checked;
  settings.bag = $<HTMLInputElement>('dbg-bag').checked;
  settings.headlineNames = $<HTMLSelectElement>('dbg-headline').value as 'all' | 'one' | 'none';
  settings.seed = Number($<HTMLInputElement>('dbg-seed').value) || 1;
  settings.skill = $<HTMLSelectElement>('dbg-skill').value as BotSkill;
  const num = (id: string, d: number) => {
    const v = Number($<HTMLInputElement>(id).value);
    return Number.isFinite(v) ? v : d;
  };
  settings.tipK = num('dbg-tipk', 0.35);
  settings.shareFloor = num('dbg-floor', 0.1);
  settings.shareCap = num('dbg-cap', 1);
  settings.shiftIngredients = Math.max(1, Math.min(4, Math.round(num('dbg-shift-n', 2))));
  settings.shiftRamp = Math.max(0, num('dbg-ramp', 0));
  $('debug').classList.add('hidden');
  start(seats);
};

showStart();
requestAnimationFrame(frame);

// Handy for poking at a running match from the browser console: `bop.session.game`.
(window as unknown as { bop: unknown }).bop = {
  get session() {
    return session;
  },
  get nudgeShown() {
    return nudgeShown;
  },
  renderer,
};
