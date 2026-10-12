import { rawDistance } from '@bop/core';
import { SHOP_COLORS, SHOP_NAMES } from './render.js';
import type { Session } from './session.js';

/** Results overlay: final standings, the ideal revealed over time, and a match log download. */
export function showEnd(s: Session, actions: { again: () => void; menu: () => void }) {
  const g = s.game;
  const snaps = g.snapshots;
  const n = s.seats.length;
  const minutes = g.cfg.durationSec / 60;

  const rows = s.seats.map((seat, p) => {
    let sum = 0;
    let close: number | null = null;
    for (const sn of snaps) {
      const d = rawDistance(sn.recipes[p], sn.ideal);
      sum += d;
      if (close === null && d <= 4) close = sn.t;
    }
    const reports = g.reportLog.filter((r) => r.to === p);
    return {
      p,
      seat,
      money: g.money[p],
      served: g.served[p],
      avgOff: sum / snaps.length,
      close,
      perMin: reports.length / minutes,
      own: reports.filter((r) => r.about === p).length,
      rival: reports.filter((r) => r.about !== p).length,
      changes: g.recipeChanges[p],
    };
  });
  rows.sort((a, b) => b.money - a.money);
  const won = rows[0].p === s.human;

  const name = (p: number, seat: string) =>
    `<span class="swatch" style="background:${SHOP_COLORS[p]}"></span> ${p === s.human ? '<b>You</b>' : `${SHOP_NAMES[p]} <span style="color:#8a7a68">(${seat})</span>`}`;

  const overlay = document.getElementById('overlay')!;
  overlay.innerHTML = `
    <div class="card">
      <h1>${s.human === null ? 'Match over' : won ? '🏆 You win!' : 'Time! The food court is closing.'}</h1>
      <table>
        <tr><th>#</th><th>Shop</th><th class="num">Money</th><th class="num">Served</th>
            <th class="num">Avg pts off</th><th class="num">Got within 4</th>
            <th class="num">Reports/min</th><th class="num">Own / rival</th><th class="num">Recipe changes</th></tr>
        ${rows
          .map(
            (r, i) => `<tr><td>${i + 1}</td><td>${name(r.p, r.seat)}</td>
              <td class="num">$${r.money.toFixed(0)}</td><td class="num">${r.served}</td>
              <td class="num">${r.avgOff.toFixed(1)}</td>
              <td class="num">${r.close === null ? '—' : fmt(r.close)}</td>
              <td class="num">${r.perMin.toFixed(1)}</td><td class="num">${r.own} / ${r.rival}</td>
              <td class="num">${r.changes}</td></tr>`,
          )
          .join('')}
      </table>
      <h3 style="margin:14px 0 4px">How far each recipe was from the ideal</h3>
      <div class="legend">Total slider points off (lower is better). Dashed lines = trend shifts.
        ${Array.from({ length: n }, (_, p) => `<span><span class="swatch" style="background:${SHOP_COLORS[p]}"></span> ${p === s.human ? 'You' : SHOP_NAMES[p]}</span>`).join('')}</div>
      <canvas id="end-chart"></canvas>
      <p style="font-size:13px;color:#8a7a68">Final ideal recipe: <b>${g.ideal.join(' / ')}</b> (dough / sauce / cheese / toppings).</p>
      <div class="buttons">
        <button class="primary" id="end-again">Play again</button>
        <button id="end-log">Download match log</button>
        <button id="end-menu">Menu</button>
      </div>
    </div>`;
  document.getElementById('end-again')!.onclick = actions.again;
  document.getElementById('end-menu')!.onclick = actions.menu;
  document.getElementById('end-log')!.onclick = () => {
    const blob = new Blob([JSON.stringify(s.telemetry())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bored-of-pizza-${g.cfg.seed}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  drawChart(document.getElementById('end-chart') as HTMLCanvasElement, s);
}

function fmt(t: number) {
  const sec = Math.round(t);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function drawChart(canvas: HTMLCanvasElement, s: Session) {
  const g = s.game;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const pad = { l: 34, r: 8, t: 8, b: 22 };
  const maxY = Math.max(10, ...g.snapshots.flatMap((sn) => sn.recipes.map((r) => rawDistance(r, sn.ideal))));
  const X = (t: number) => pad.l + (t / g.cfg.durationSec) * (w - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - v / maxY) * (h - pad.t - pad.b);

  ctx.strokeStyle = '#ecdcc4';
  ctx.fillStyle = '#8a7a68';
  ctx.font = '11px system-ui';
  ctx.lineWidth = 1;
  for (let v = 0; v <= maxY; v += 10) {
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(v));
    ctx.lineTo(w - pad.r, Y(v));
    ctx.stroke();
    ctx.fillText(String(v), 6, Y(v) + 4);
  }
  for (let m = 0; m <= g.cfg.durationSec / 60; m += 2) ctx.fillText(`${m}:00`, X(m * 60) - 10, h - 6);
  ctx.setLineDash([4, 4]);
  for (const st of g.shiftTimes) {
    ctx.beginPath();
    ctx.moveTo(X(st), pad.t);
    ctx.lineTo(X(st), h - pad.b);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  s.seats.forEach((_, p) => {
    ctx.strokeStyle = SHOP_COLORS[p];
    ctx.lineWidth = p === s.human ? 3 : 1.5;
    ctx.beginPath();
    g.snapshots.forEach((sn, i) => {
      const x = X(sn.t);
      const y = Y(rawDistance(sn.recipes[p], sn.ideal));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}
