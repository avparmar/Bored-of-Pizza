/**
 * Browser-to-browser multiplayer. The host's tab runs the authoritative game; other players
 * connect to it over WebRTC data channels (PeerJS). A free public PeerJS server only introduces
 * the browsers to each other; game traffic then flows directly between them.
 */
import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import type { Action, Config, GameEvent, Observation, Recipe, Report } from '@bop/core';
import type { BotSkill } from '@bop/sim';
import type { EndData, Match } from './match.js';
import { Session, type Seat } from './session.js';

const ID_PREFIX = 'bored-of-pizza-';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** How often the host sends each player a fresh view of the game (per second). */
const SEND_HZ = 10;

export interface LobbyPlayer {
  seat: number;
  name: string;
  host: boolean;
}

/** Messages host → guest. */
type HostMsg =
  | { t: 'welcome'; seat: number }
  | { t: 'lobby'; players: LobbyPlayer[] }
  | { t: 'start'; seat: number; seats: string[]; names: string[]; cfg: Config }
  | { t: 'obs'; obs: Omit<Observation, 'cfg' | 'reports'>; events: GameEvent[]; paused: boolean }
  | { t: 'end'; data: EndData }
  | { t: 'notice'; text: string }
  | { t: 'full' }
  | { t: 'ping' };

/** Messages guest → host. */
type GuestMsg = { t: 'hello'; name: string } | { t: 'act'; action: Action } | { t: 'ping' };

/** Both sides ping every PING_SEC; silence for DROP_SEC means the other side is gone. */
const PING_SEC = 2;
const DROP_SEC = 10;

/** Optional local PeerJS server for testing: ?peerHost=localhost&peerPort=9000&peerPath=/ */
function peerOptions(): PeerOptions {
  const q = new URLSearchParams(location.search);
  const host = q.get('peerHost');
  if (!host) return { debug: 1 };
  return {
    host,
    port: Number(q.get('peerPort') ?? 9000),
    path: q.get('peerPath') ?? '/',
    secure: q.get('peerSecure') === '1',
    debug: 1,
  };
}

function randomCode() {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ------------------------------------------------------------------ host

export class HostLobby {
  code = '';
  private peer: Peer | null = null;
  private guests = new Map<number, { conn: DataConnection; name: string }>();
  private heard = new Map<DataConnection, number>();
  private timer: number | undefined;
  onChange: () => void = () => {};
  onError: (msg: string) => void = () => {};

  constructor(
    private hostName: string,
    private maxPlayers = 4,
  ) {}

  /** Claim a room code on the PeerJS server (retries if the code is taken). */
  open(): Promise<string> {
    return new Promise((resolve, reject) => {
      const tryCode = (attempt: number) => {
        const code = randomCode();
        const peer = new Peer(ID_PREFIX + code, peerOptions());
        peer.on('open', () => {
          this.peer = peer;
          this.code = code;
          peer.on('connection', (conn) => this.accept(conn));
          this.timer = window.setInterval(() => this.heartbeat(), PING_SEC * 1000);
          resolve(code);
        });
        peer.on('error', (err: Error & { type?: string }) => {
          if (err.type === 'unavailable-id' && attempt < 5) {
            peer.destroy();
            tryCode(attempt + 1);
          } else if (!this.peer) {
            reject(new Error(friendlyError(err)));
          } else {
            this.onError(friendlyError(err));
          }
        });
      };
      tryCode(0);
    });
  }

  get players(): LobbyPlayer[] {
    return [
      { seat: 0, name: this.hostName, host: true },
      ...[...this.guests].map(([seat, g]) => ({ seat, name: g.name, host: false })),
    ];
  }

  private heartbeat() {
    const now = performance.now();
    for (const [seat, g] of this.guests) {
      if (now - (this.heard.get(g.conn) ?? now) > DROP_SEC * 1000) {
        this.guests.delete(seat);
        g.conn.close();
        this.broadcastLobby();
      } else g.conn.send({ t: 'ping' } satisfies HostMsg);
    }
  }

  private accept(conn: DataConnection) {
    conn.on('data', (raw) => {
      const msg = raw as GuestMsg;
      this.heard.set(conn, performance.now());
      if (msg.t !== 'hello') return;
      const taken = new Set([0, ...this.guests.keys()]);
      const seat = [1, 2, 3].find((s) => !taken.has(s) && s < this.maxPlayers);
      if (seat === undefined || this.started) {
        conn.send({ t: 'full' } satisfies HostMsg);
        setTimeout(() => conn.close(), 200);
        return;
      }
      this.guests.set(seat, { conn, name: (msg.name || 'Guest').slice(0, 16) });
      conn.send({ t: 'welcome', seat } satisfies HostMsg);
      this.broadcastLobby();
    });
    conn.on('close', () => {
      for (const [seat, g] of this.guests) if (g.conn === conn) this.guests.delete(seat);
      if (!this.started) this.broadcastLobby();
    });
  }

  private broadcastLobby() {
    const msg: HostMsg = { t: 'lobby', players: this.players };
    for (const g of this.guests.values()) g.conn.send(msg);
    this.onChange();
  }

  private started = false;

  /** Start the match: humans keep their seats, bots fill the rest. */
  start(opts: { overrides: Partial<Config>; skill: BotSkill; botLineup: Seat[] }): HostMatch {
    this.started = true;
    window.clearInterval(this.timer);
    const seats: Seat[] = [0, 1, 2, 3].map((s) =>
      s === 0 || this.guests.has(s) ? 'human' : opts.botLineup[s] ?? 'hybrid',
    );
    const names = [0, 1, 2, 3].map((s) => (s === 0 ? this.hostName : this.guests.get(s)?.name ?? ''));
    const session = new Session({ seats, overrides: opts.overrides, skill: opts.skill, localSeat: 0, names });
    const conns = new Map([...this.guests].map(([seat, g]) => [seat, g.conn]));
    return new HostMatch(session, conns, this.peer!, this.heard);
  }

  close() {
    window.clearInterval(this.timer);
    for (const g of this.guests.values()) g.conn.close();
    this.peer?.destroy();
  }
}

export class HostMatch implements Match {
  readonly multiplayer = true;
  readonly canControlTime = true;
  private readySeats = new Set<number>();
  private sinceSend = 0;
  private ended = false;
  notices: string[] = [];

  constructor(
    readonly session: Session,
    private conns: Map<number, DataConnection>,
    private peer: Peer,
    private heard: Map<DataConnection, number>,
  ) {
    // A backgrounded host tab gets throttled; let it catch up in bigger steps.
    session.maxStep = 1.5;
    const s = session;
    for (const [seat, conn] of conns) {
      conn.send({ t: 'start', seat, seats: s.seats, names: s.names, cfg: s.cfg } satisfies HostMsg);
      this.heard.set(conn, performance.now());
      conn.on('data', (raw) => {
        this.heard.set(conn, performance.now());
        this.onGuest(seat, raw as GuestMsg);
      });
      conn.on('close', () => this.dropped(seat));
    }
  }

  get game() {
    return this.session.game;
  }
  get human() {
    return this.session.human;
  }
  get seats() {
    return this.session.seats;
  }
  get names() {
    return this.session.names;
  }
  get cfg() {
    return this.session.cfg;
  }
  get ideal() {
    return this.session.ideal;
  }
  get done() {
    return this.session.done;
  }
  get renderTime() {
    return this.session.renderTime;
  }
  get paused() {
    return this.session.paused;
  }
  set paused(v: boolean) {
    this.session.paused = v;
  }
  get speed() {
    return 1;
  }
  set speed(_v: number) {
    // Fixed at 1× in multiplayer.
  }

  private onGuest(seat: number, msg: GuestMsg) {
    if (msg.t !== 'act') return;
    const a = msg.action;
    if (a.type === 'ready') this.markReady(seat);
    else this.session.actAs(seat, a);
  }

  private markReady(seat: number) {
    this.readySeats.add(seat);
    const humans = this.session.humanSeats;
    if (humans.every((s) => this.readySeats.has(s))) this.session.ready();
  }

  private dropped(seat: number) {
    if (this.session.done || !this.conns.has(seat)) return;
    this.conns.get(seat)?.close();
    this.conns.delete(seat);
    const name = this.session.names[seat] || 'A player';
    this.session.replaceWithBot(seat);
    this.markReady(seat);
    this.notices.push(`${name} left. A bot is running their shop now.`);
    this.broadcast({ t: 'notice', text: `${name} left. A bot is running their shop now.` });
  }

  private broadcast(msg: HostMsg) {
    for (const c of this.conns.values()) c.send(msg);
  }

  update(realDt: number): GameEvent[] {
    const mine = this.session.update(realDt);
    const now = performance.now();
    for (const [seat, conn] of this.conns) {
      if (now - (this.heard.get(conn) ?? now) > DROP_SEC * 1000) this.dropped(seat);
    }
    this.sinceSend += realDt;
    if (this.sinceSend >= 1 / SEND_HZ || this.session.done) {
      this.sinceSend = 0;
      for (const [seat, conn] of this.conns) {
        const o = this.session.game.observe(seat) as Partial<Observation>;
        delete o.cfg;
        delete o.reports;
        conn.send({
          t: 'obs',
          obs: o as Omit<Observation, 'cfg' | 'reports'>,
          events: this.session.takePending(seat),
          paused: this.session.paused,
        } satisfies HostMsg);
      }
    }
    if (this.session.done && !this.ended) {
      this.ended = true;
      for (const [seat, conn] of this.conns) {
        conn.send({ t: 'end', data: { ...this.session.endData(), human: seat } } satisfies HostMsg);
      }
    }
    return mine;
  }

  obs() {
    return this.session.obs();
  }

  act(action: Action) {
    this.session.act(action);
  }

  ready() {
    this.markReady(this.session.human ?? 0);
  }

  endData() {
    return this.session.endData();
  }

  telemetry() {
    return this.session.telemetry();
  }

  dispose() {
    for (const c of this.conns.values()) c.close();
    setTimeout(() => this.peer.destroy(), 300);
  }
}

// ------------------------------------------------------------------ guest

export class GuestLobby {
  seat = -1;
  players: LobbyPlayer[] = [];
  onChange: () => void = () => {};
  onStart: (m: RemoteMatch) => void = () => {};
  onError: (msg: string) => void = () => {};
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private match: RemoteMatch | null = null;
  private lastHeard = performance.now();
  private timer: number | undefined;

  join(code: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const peer = new Peer(peerOptions());
      this.peer = peer;
      let settled = false;
      const fail = (msg: string) => {
        if (!settled) {
          settled = true;
          reject(new Error(msg));
        } else this.onError(msg);
      };
      peer.on('error', (err: Error & { type?: string }) => fail(friendlyError(err)));
      peer.on('open', () => {
        const conn = peer.connect(ID_PREFIX + normalizeCode(code), { reliable: true, serialization: 'binary' });
        this.conn = conn;
        const timer = setTimeout(() => fail("Couldn't reach that room. Check the code, or the host's network may block direct connections."), 12000);
        conn.on('open', () => {
          conn.send({ t: 'hello', name } satisfies GuestMsg);
          this.lastHeard = performance.now();
          this.timer = window.setInterval(() => {
            if (performance.now() - this.lastHeard > DROP_SEC * 1000) {
              window.clearInterval(this.timer);
              conn.close();
              if (this.match) this.match.hostLeft();
              else fail('Lost the connection to the host.');
            } else conn.send({ t: 'ping' } satisfies GuestMsg);
          }, PING_SEC * 1000);
        });
        conn.on('data', (raw) => {
          const msg = raw as HostMsg;
          this.lastHeard = performance.now();
          if (msg.t === 'ping') return;
          if (msg.t === 'full') fail('That room is full or already playing.');
          else if (msg.t === 'welcome') {
            clearTimeout(timer);
            this.seat = msg.seat;
            settled = true;
            resolve();
          } else if (msg.t === 'lobby') {
            this.players = msg.players;
            this.onChange();
          } else if (msg.t === 'start') {
            this.match = new RemoteMatch(conn, peer, msg.seat, msg.seats, msg.names, msg.cfg);
            this.onStart(this.match);
          } else this.match?.receive(msg);
        });
        conn.on('close', () => {
          window.clearInterval(this.timer);
          if (this.match) this.match.hostLeft();
          else fail('The host closed the room.');
        });
      });
    });
  }

  close() {
    window.clearInterval(this.timer);
    this.conn?.close();
    this.peer?.destroy();
  }
}

export class RemoteMatch implements Match {
  readonly multiplayer = true;
  readonly canControlTime = false;
  readonly ideal = null;
  paused = false;
  speed = 1;
  private latest: Observation | null = null;
  private receivedAt = 0;
  private events: GameEvent[] = [];
  private reports: Report[] = [];
  private end: EndData | null = null;
  notices: string[] = [];
  lostHost = false;

  constructor(
    private conn: DataConnection,
    private peer: Peer,
    readonly human: number,
    readonly seats: string[],
    readonly names: string[],
    readonly cfg: Config,
  ) {}

  receive(msg: HostMsg) {
    if (msg.t === 'obs') {
      for (const e of msg.events) if (e.type === 'report') this.reports.push(e.report);
      this.latest = { ...(msg.obs as Observation), cfg: this.cfg, reports: this.reports };
      this.receivedAt = performance.now();
      this.paused = msg.paused;
      this.events.push(...msg.events);
    } else if (msg.t === 'end') {
      this.end = msg.data;
    } else if (msg.t === 'notice') {
      this.notices.push(msg.text);
    }
  }

  hostLeft() {
    if (this.end) return;
    this.lostHost = true;
    this.notices.push('The host left, so the game has ended.');
  }

  get done() {
    return this.end !== null || this.lostHost;
  }

  /** Extrapolate a little past the last update so movement stays smooth between messages. */
  get renderTime() {
    if (!this.latest) return 0;
    if (this.paused || this.latest.phase === 'pregame') return this.latest.t;
    return this.latest.t + Math.min(0.25, (performance.now() - this.receivedAt) / 1000);
  }

  update(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  obs(): Observation {
    if (this.latest) return this.latest;
    // Before the first update arrives: an empty court.
    return {
      t: 0,
      me: this.human,
      cfg: this.cfg,
      phase: 'pregame',
      pregameLeft: this.cfg.pregameSec,
      recipes: this.seats.map(() => [0, 0, 0, 0] as Recipe),
      money: this.seats.map(() => 0),
      queues: this.seats.map(() => 0),
      closedUntil: this.seats.map(() => 0),
      served: this.seats.map(() => 0),
      headlines: [],
      reports: [],
      startingIntel: null,
      tables: [],
      myWaiters: [],
      restaurantPos: [],
      doorPos: [],
      entrances: [],
      customers: [],
      waiters: [],
    };
  }

  act(action: Action) {
    if (this.done) return;
    this.conn.send({ t: 'act', action } satisfies GuestMsg);
  }

  ready() {
    this.act({ type: 'ready' });
  }

  endData() {
    return this.end;
  }

  dispose() {
    this.conn.close();
    setTimeout(() => this.peer.destroy(), 300);
  }
}

function friendlyError(err: Error & { type?: string }) {
  switch (err.type) {
    case 'peer-unavailable':
      return 'No room with that code. Check the code and try again.';
    case 'network':
    case 'server-error':
    case 'socket-error':
      return "Couldn't reach the matchmaking server. Check your internet connection.";
    case 'browser-incompatible':
      return "This browser doesn't support peer-to-peer connections.";
    default:
      return err.message || 'Connection error.';
  }
}
