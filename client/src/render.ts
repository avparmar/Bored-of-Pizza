import { INGREDIENTS, legPos, type Observation, type Vec } from '@bop/core';

export const SHOP_COLORS = ['#E53935', '#1E88E5', '#F9C80E', '#2EAD4B'];
export const SHOP_DARK = ['#9E1E1B', '#0D4F8B', '#A9820A', '#1B6E2F'];
export const SHOP_NAMES = ['Red', 'Blue', 'Yellow', 'Green'];
export const SHORT = ['D', 'S', 'C', 'T'];

interface Popup {
  text: string;
  at: Vec;
  born: number;
  color: string;
  life: number;
  size: number;
}

const MARGIN = 2; // world units around the court (entrances sit just outside)

/** Draws the food court on a canvas. Knows nothing about rules, only the Observation. */
export class CourtRenderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 20;
  private size = 0;
  private popups: Popup[] = [];
  hoverTable: number | null = null;
  hoverCustomer: number | null = null;
  /** Where each customer was last drawn (world units), for click hit-testing. */
  private customerPos = new Map<number, { pos: Vec; restaurant: number }>();
  /** Where each of your waiters was last drawn (world units), for right-click recall. */
  private myWaiterPos = new Map<number, Vec>();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize(courtSize: number) {
    const parent = this.canvas.parentElement!;
    const side = Math.floor(Math.min(parent.clientWidth, parent.clientHeight));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${side}px`;
    this.canvas.style.height = `${side}px`;
    this.canvas.width = side * dpr;
    this.canvas.height = side * dpr;
    this.size = side;
    this.scale = side / (courtSize + MARGIN * 2);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  toScreen(p: Vec): Vec {
    return { x: (p.x + MARGIN) * this.scale, y: (p.y + MARGIN) * this.scale };
  }

  toWorld(sx: number, sy: number): Vec {
    return { x: sx / this.scale - MARGIN, y: sy / this.scale - MARGIN };
  }

  tableAt(obs: Observation, sx: number, sy: number): number | null {
    const w = this.toWorld(sx, sy);
    let best: number | null = null;
    let bd = 1.3;
    for (const tb of obs.tables) {
      const d = Math.hypot(tb.pos.x - w.x, tb.pos.y - w.y);
      if (d < bd) {
        bd = d;
        best = tb.id;
      }
    }
    return best;
  }

  /** Where a customer was last drawn, in canvas pixels (handy for tests and debugging). */
  customerScreen(id: number): Vec | null {
    const c = this.customerPos.get(id);
    return c ? this.toScreen(c.pos) : null;
  }

  /** Your own customer under the cursor (not one who's leaving). */
  customerAt(sx: number, sy: number, me: number): number | null {
    const w = this.toWorld(sx, sy);
    let best: number | null = null;
    let bd = 0.7;
    for (const [id, c] of this.customerPos) {
      if (c.restaurant !== me) continue;
      const d = Math.hypot(c.pos.x - w.x, c.pos.y - w.y);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  }

  popup(text: string, at: Vec, color: string, now: number, life = 1.6, size = 0.7) {
    this.popups.push({ text, at, born: now, color, life, size });
  }

  /** Index of your waiter under the cursor. */
  waiterAt(sx: number, sy: number): number | null {
    const w = this.toWorld(sx, sy);
    for (const [idx, p] of this.myWaiterPos) if (Math.hypot(p.x - w.x, p.y - w.y) < 0.7) return idx;
    return null;
  }

  draw(obs: Observation, t: number, me: number | null, ideal: number[] | null) {
    const { ctx, scale: k } = this;
    const S = obs.cfg.courtSize;
    ctx.clearRect(0, 0, this.size, this.size);

    // Floor: cheerful checkerboard tiles.
    for (let x = 0; x < S; x++) {
      for (let y = 0; y < S; y++) {
        ctx.fillStyle = (x + y) % 2 ? '#FFF3DC' : '#FDE8C4';
        const p = this.toScreen({ x, y });
        ctx.fillRect(p.x, p.y, k + 0.5, k + 0.5);
      }
    }
    ctx.strokeStyle = '#C9A26B';
    ctx.lineWidth = 2;
    const o = this.toScreen({ x: 0, y: 0 });
    ctx.strokeRect(o.x, o.y, S * k, S * k);

    // Entrances
    for (const e of obs.entrances) {
      const p = this.toScreen(e);
      ctx.fillStyle = '#C9A26B';
      ctx.fillRect(p.x - k * 1.2, p.y - k * 0.6, k * 2.4, k * 1.2);
    }

    // Shops, with their public recipe printed on the storefront.
    obs.restaurantPos.forEach((rp, r) => {
      const half = 1.9;
      const a = this.toScreen({ x: rp.x - half, y: rp.y - half });
      ctx.fillStyle = SHOP_COLORS[r];
      ctx.strokeStyle = r === me ? '#111' : SHOP_DARK[r];
      ctx.lineWidth = r === me ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(a.x, a.y, k * half * 2, k * half * 2, k * 0.4);
      ctx.fill();
      ctx.stroke();
      const c = this.toScreen(rp);
      const ink = r === 2 ? '#3A2A00' : '#fff';
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(k * 0.6)}px system-ui, sans-serif`;
      ctx.fillText(r === me ? 'YOU' : SHOP_NAMES[r].toUpperCase(), c.x, c.y - k * 1.15);

      const hidden = obs.phase === 'pregame' && r !== me;
      const rec = obs.recipes[r];
      const cell = (i: number) => (hidden ? `${SHORT[i]}?` : `${SHORT[i]}${rec[i]}`);
      // Two rows on a light plate so the numbers read at a glance.
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(c.x - k * 1.65, c.y - k * 0.72, k * 3.3, k * 1.95, k * 0.25);
      ctx.fill();
      ctx.fillStyle = SHOP_DARK[r];
      ctx.font = `800 ${Math.round(k * 0.72)}px ui-monospace, monospace`;
      ctx.fillText(`${cell(0)} ${cell(1)}`, c.x, c.y - k * 0.22);
      ctx.fillText(`${cell(2)} ${cell(3)}`, c.x, c.y + k * 0.7);

      // Door mat
      const d = this.toScreen(obs.doorPos[r]);
      ctx.fillStyle = SHOP_DARK[r];
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(d.x, d.y, k * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Tables
    for (const tb of obs.tables) {
      const p = this.toScreen(tb.pos);
      ctx.fillStyle = tb.id === this.hoverTable ? '#E7C08A' : '#D9AE74';
      ctx.strokeStyle = '#8A6239';
      ctx.lineWidth = tb.id === this.hoverTable ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, k * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Where each customer carrying a pizza is headed (public: you can watch them walk).
    for (const c of obs.customers) {
      if (c.state !== 'walking' || c.table === null) continue;
      const a = this.toScreen(legPos(c, t));
      const b = this.toScreen(obs.tables[c.table].pos);
      ctx.strokeStyle = SHOP_COLORS[c.restaurant];
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, k * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Customers
    this.customerPos.clear();
    const followed = new Set(
      me === null ? [] : obs.myWaiters.filter((w) => w.follow !== null).map((w) => w.follow!),
    );
    for (const c of obs.customers) {
      let pos = legPos(c, t);
      if (c.state === 'queued' || c.state === 'cooking') {
        const door = obs.doorPos[c.restaurant];
        const dx = door.x < S / 2 ? 1 : -1;
        const dy = door.y < S / 2 ? 1 : -1;
        const n = c.state === 'cooking' ? 0 : c.queueIdx + 1;
        // Line forms along the court edge, away from the door.
        pos = { x: door.x + dx * 0.0, y: door.y + dy * 0.9 * n };
        if (n > 0) pos = { x: door.x - dx * 0.2, y: door.y + dy * 0.9 * n };
      }
      if (c.state === 'seated') pos = { x: pos.x, y: pos.y - 0.55 };
      if (c.state !== 'leaving') this.customerPos.set(c.id, { pos, restaurant: c.restaurant });
      const p = this.toScreen(pos);
      if (followed.has(c.id) || c.id === this.hoverCustomer) {
        ctx.strokeStyle = followed.has(c.id) ? '#111' : '#888';
        ctx.lineWidth = 2;
        ctx.setLineDash(followed.has(c.id) ? [] : [3, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, k * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const light = c.id % 3 === 0;
      ctx.fillStyle = light ? '#F7F7F7' : c.id % 3 === 1 ? '#2B2D42' : '#4A3B58';
      ctx.strokeStyle = '#1B1B24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, k * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (c.hasPizza) {
        // A slice in the shop's colour.
        ctx.fillStyle = SHOP_COLORS[c.restaurant];
        ctx.strokeStyle = SHOP_DARK[c.restaurant];
        ctx.beginPath();
        ctx.moveTo(p.x + k * 0.15, p.y - k * 0.1);
        ctx.lineTo(p.x + k * 0.6, p.y - k * 0.25);
        ctx.lineTo(p.x + k * 0.5, p.y + k * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Your waiters waiting to follow a customer: line from waiter to that customer.
    for (const mw of obs.myWaiters) {
      if (mw.follow === null || me === null) continue;
      const cp = this.customerPos.get(mw.follow);
      if (!cp) continue;
      const a = this.toScreen(mw.pos);
      const b = this.toScreen(cp.pos);
      ctx.strokeStyle = '#111';
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waiters
    this.myWaiterPos.clear();
    for (const w of obs.waiters) {
      const pos = legPos(w, t);
      const p = this.toScreen(pos);
      const mine = w.owner === me;
      if (w.target !== null && t < w.arriveAt) {
        const tp = this.toScreen(obs.tables[w.target].pos);
        ctx.strokeStyle = SHOP_COLORS[w.owner];
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = mine ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tp.x, tp.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      let drawAt = { x: pos.x, y: pos.y + (w.stationed !== null ? 0.6 : 0) };
      if (w.state === 'home') {
        // Stand beside the door, out of the queue (which runs along the court edge).
        const door = obs.doorPos[w.owner];
        const dx = door.x < S / 2 ? 1 : -1;
        const dy = door.y < S / 2 ? 1 : -1;
        drawAt = { x: door.x + dx * (1.0 + 0.95 * w.idx), y: door.y - dy * 0.3 };
      }
      if (mine) this.myWaiterPos.set(w.idx, drawAt);
      const q = this.toScreen(drawAt);
      ctx.fillStyle = SHOP_COLORS[w.owner];
      ctx.strokeStyle = mine ? '#111' : '#fff';
      ctx.lineWidth = mine ? 3 : 2;
      ctx.beginPath();
      ctx.arc(q.x, q.y, k * (mine ? 0.48 : 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Apron
      ctx.fillStyle = '#fff';
      ctx.fillRect(q.x - k * 0.15, q.y - k * 0.05, k * 0.3, k * 0.28);
    }

    // Popups (tips, blocked)
    this.popups = this.popups.filter((pp) => t - pp.born < pp.life);
    for (const pp of this.popups) {
      const age = t - pp.born;
      const p = this.toScreen({ x: pp.at.x, y: pp.at.y - age * (1.9 / pp.life) });
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - pp.life * 0.5) / (pp.life * 0.5));
      ctx.font = `bold ${Math.round(k * pp.size)}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(pp.text, p.x, p.y);
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }

    // Debug: reveal the ideal
    if (ideal) {
      ctx.font = `bold ${Math.round(k * 0.6)}px ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#7B1FA2';
      ctx.fillText(
        `IDEAL ${ideal.map((v, i) => `${INGREDIENTS[i][0].toUpperCase()}${v}`).join(' ')}`,
        o.x + 4,
        o.y + S * k + k * 1.2,
      );
    }
  }
}
