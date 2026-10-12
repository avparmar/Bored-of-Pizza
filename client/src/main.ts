import { INGREDIENTS, type GameEvent, type MagnitudeMode, type Observation, type Recipe, type Report } from '@bop/core';
import { STRATEGIES } from '@bop/sim';
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
const SEAT_OPTIONS: Seat[] = ['human', ...(Object.keys(STRATEGIES) as Seat[])];

// ------------------------------------------------------------------ settings

const settings = {
  seats: ['human', 'hybrid', 'analyst', 'hawk'] as Seat[],
  magnitude: 'none' as MagnitudeMode,
  arrivalMeanSec: 1.5,
  seed: Math.floor(Math.random() * 1e6),
  reveal: false,
};

// ------------------------------------------------------------------ state

const canvas = $<HTMLCanvasElement>('court');
const renderer = new CourtRenderer(canvas);
let session: Session | null = null;
let draft: Recipe = [11, 11, 11, 11];
let lastUi = 0;
let lastFrame = performance.now();
let latestIds: number[] = [];

// ------------------------------------------------------------------ start / restart

function start(seats: Seat[]) {
  settings.seats = seats;
  session = new Session({
    seats,
    overrides: { seed: settings.seed, magnitude: settings.magnitude, arrivalMeanSec: settings.arrivalMeanSec },
  });
  session.speed = Number($<HTMLSelectElement>('speed').value);
  const obs = session.game.observe(session.human ?? 0);
  draft = [...obs.recipes[session.human ?? 0]] as Recipe;
  buildRecipeRows();
  $('intel-latest').innerHTML = '';
  $('intel-history').innerHTML = '';
  latestIds = [];
  $('headline').textContent = 'Doors open! Customers are arriving.';
  const human = session.human !== null;
  $('recipe-panel').classList.toggle('hidden', !human);
  $('intel-panel').classList.toggle('hidden', !human);
  const tip = obs.startingIntel;
  $('tipoff').innerHTML = tip
    ? `🕵️ <b>Your tip-off:</b> at opening, customers want <b>${NAMES[tip.ingredient]} ${tip.value}</b>. Nobody else knows this one, and tastes drift.`
    : '';
  $('overlay').innerHTML = '';
  renderer.resize(obs.cfg.courtSize);
}

function newSeed() {
  settings.seed = Math.floor(Math.random() * 1e6);
  $<HTMLInputElement>('dbg-seed').value = String(settings.seed);
}

function showStart() {
  $('overlay').innerHTML = `
    <div class="card">
      <h1>🍕 Bored of Pizza <small style="font-size:14px;color:#8a7a68">prototype</small></h1>
      <p>You run the <b style="color:${SHOP_COLORS[0]}">red</b> pizzeria in a mall food court.
      Pizzas sell at cost, so you earn only from <b>tips</b>, and customers tip more the closer your
      pizza is to today's taste. Nobody knows exactly what that taste is, and it keeps changing.</p>
      <ul>
        <li><b>Tune your recipe</b> on the right, then press <b>Apply</b>. Every shop's recipe is public.</li>
        <li><b>Click a table</b> to send a waiter. When that diner finishes, the waiter reports back
        whether one ingredient should go <b>up</b> or <b>down</b>. This works on rivals' customers too.</li>
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
      <span class="name">${name}</span>
      <div class="stepper">
        <button data-d="-5">−5</button><button data-d="-1">−1</button>
        <span class="val" id="val-${i}"></span>
        <button data-d="1">+1</button><button data-d="5">+5</button>
        <span class="now" id="now-${i}"></span>
      </div>
      <input type="range" min="1" max="${scale}" step="1" id="rng-${i}" />
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
  return `<div class="verdict ${r.direction}">${verdict}</div>
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
    .join('') || '<div class="meta" style="color:#8a7a68;font-size:13px">No reports yet. Click a table with a diner on it to send a waiter.</div>';
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

// ------------------------------------------------------------------ leaderboard, clock

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
      const d = obs.doorPos[s.human];
      renderer.popup(`+$${e.amount.toFixed(2)}`, { x: d.x, y: d.y - 0.6 }, '#1B6E2F', obs.t);
    } else if (e.type === 'headline') {
      const h = $('headline');
      h.textContent = `📰 TREND ALERT! Everyone's suddenly talking about ${INGREDIENTS[e.ingredient].toUpperCase()}…`;
      h.classList.remove('flash');
      void h.offsetWidth;
      h.classList.add('flash');
    } else if (e.type === 'report' && s.human !== null) {
      addHistory(e.report, s.human, obs.t);
    } else if (e.type === 'blocked' && s.human !== null) {
      renderer.popup('Taken!', obs.tables[e.table].pos, '#C62828', obs.t);
    } else if (e.type === 'recipe' && e.restaurant !== s.human) {
      const p = obs.restaurantPos[e.restaurant];
      renderer.popup('new recipe', { x: p.x, y: p.y + (p.y < 10 ? 3 : -3) }, SHOP_COLORS[e.restaurant], obs.t);
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
      if (session.human !== null) {
        refreshIntel(obs);
        refreshRecipe();
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
  renderer.hoverTable = renderer.tableAt(obs, e.offsetX, e.offsetY);
  canvas.style.cursor = renderer.hoverTable !== null ? 'pointer' : 'default';
});
canvas.addEventListener('mouseleave', () => (renderer.hoverTable = null));
canvas.addEventListener('click', (e) => {
  if (!session || session.human === null) return;
  const obs = session.game.observe(session.human);
  const tb = renderer.tableAt(obs, e.offsetX, e.offsetY);
  if (tb !== null) session.act({ type: 'sendWaiter', table: tb });
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
  if (e.key === 'Enter') applyDraft();
  else if (e.key === 'Escape') resetDraft();
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
  $<HTMLInputElement>('dbg-seed').value = String(settings.seed);
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
  settings.arrivalMeanSec = Number($<HTMLInputElement>('dbg-arrival').value) || 1.5;
  settings.seed = Number($<HTMLInputElement>('dbg-seed').value) || 1;
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
};
