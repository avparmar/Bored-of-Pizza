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
}

const MARGIN = 2; // world units around the court (entrances sit just outside)

/** Draws the food court on a canvas. Knows nothing about rules, only the Observation. */
export class CourtRenderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 20;
  private size = 0;
  private popups: Popup[] = [];
  hoverTable: number | null = null;

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

  popup(text: string, at: Vec, color: string, now: number) {
    this.popups.push({ text, at, born: now, color });
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

    // Shops
    obs.restaurantPos.forEach((rp, r) => {
      const a = this.toScreen({ x: rp.x - 1.6, y: rp.y - 1.6 });
      ctx.fillStyle = SHOP_COLORS[r];
      ctx.strokeStyle = SHOP_DARK[r];
      ctx.lineWidth = r === me ? 5 : 3;
      ctx.beginPath();
      ctx.roundRect(a.x, a.y, k * 3.2, k * 3.2, k * 0.4);
      ctx.fill();
      ctx.stroke();
      const c = this.toScreen(rp);
      ctx.fillStyle = r === 2 ? '#3A2A00' : '#fff';
      ctx.font = `bold ${Math.round(k * 0.9)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r === me ? 'YOU' : SHOP_NAMES[r][0], c.x, c.y);

      // Public recipe label, toward the middle of the court.
      const rec = obs.recipes[r];
      const label = rec.map((v, i) => `${SHORT[i]}${v}`).join(' ');
      // Sits in the margin outside the court, beside the shop, so nothing walks over it.
      const lp = this.toScreen({
        x: rp.x + (rp.x < S / 2 ? 5.6 : -5.6),
        y: rp.y < S / 2 ? -1.0 : S + 1.0,
      });
      ctx.font = `700 ${Math.round(k * 0.6)}px ui-monospace, monospace`;
      const wdt = ctx.measureText(label).width + 10;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = SHOP_COLORS[r];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(lp.x - wdt / 2, lp.y - k * 0.42, wdt, k * 0.84, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = SHOP_DARK[r];
      ctx.fillText(label, lp.x, lp.y);

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

    // Customers
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
      const p = this.toScreen(pos);
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

    // Waiters
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
      const off = w.state === 'home' ? (w.idx === 0 ? -0.45 : 0.45) : 0;
      const q = this.toScreen({ x: pos.x + off, y: pos.y + (w.stationed !== null ? 0.6 : 0) });
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
    this.popups = this.popups.filter((pp) => t - pp.born < 1.6);
    for (const pp of this.popups) {
      const age = t - pp.born;
      const p = this.toScreen({ x: pp.at.x, y: pp.at.y - age * 1.2 });
      ctx.globalAlpha = Math.max(0, 1 - age / 1.6);
      ctx.font = `bold ${Math.round(k * 0.7)}px system-ui, sans-serif`;
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
