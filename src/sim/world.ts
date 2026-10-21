import { archetypeById, type Archetype } from '../data/archetypes';
import { generateMap } from '../world/mapgen';
import {
  BKind,
  CAPACITY,
  COSTS,
  CONSTRUCTION_TICKS,
  CState,
  MAP_SIZE,
  Purpose,
  TAX_PER_DAY,
  TICKS_PER_DAY,
  TICKS_PER_HOUR,
  Terrain,
  TileUse,
  UPKEEP_PER_DAY,
  WALK_SPEED,
  Zone,
} from './constants';
import { bandFor, businessDay, type DayResult } from './economy';
import { RoadGraph } from './pathfinding';
import { Rng } from './rng';
import { Buildings, Citizens } from './stores';

export type Tool = 'road' | 'res' | 'com' | 'ind' | 'park' | 'bulldoze';

export type Command = { t: 'paint'; tool: Tool; tiles: number[] } | { t: 'undo' } | { t: 'redo' };

export interface GameEvent {
  tick: number;
  key: string;
  params?: Record<string, string | number>;
  tile?: number;
}

export interface HappinessFactors {
  base: number;
  lavoro: number;
  parchi: number;
  negozi: number;
  tragitto: number;
  inquinamento: number;
}

export interface Demand {
  r: number;
  c: number;
  i: number;
}

export interface BusinessState {
  archetipo: string;
  tile: number;
  investimento: number;
  rientroBersaglio: number;
  fascia: string;
  dipendenti: number;
  posti: number;
  bacino: number;
  passaggioOggi: number;
  visiteOggi: number;
  concorrenti: number;
  stimaOggi: DayResult;
  storico: DayResult[];
  incassatoTotale: number;
}

export interface LedgerDay {
  giorno: number;
  tasse: number;
  manutenzione: number;
  business: number;
  saldo: number;
}

type PaintCmd = Extract<Command, { t: 'paint' }>;

interface UndoEntry {
  cmd: PaintCmd;
  tiles: number[];
  prevUse: number[];
  prevZone: number[];
  prevTerrain: number[];
  cost: number;
}

export const START_MONEY = 60000;
/** Share of residents who work (Part 7.1); the rest are children, students, retirees. */
export const WORKER_SHARE = 0.55;

export class World {
  readonly size: number;
  readonly seed: number;
  readonly cityName: string;
  readonly archetype: Archetype;
  readonly rng: Rng;
  tick = 0;
  money = START_MONEY;

  readonly terrain: Uint8Array;
  readonly use: Uint8Array;
  readonly zone: Uint8Array;
  readonly bldAt: Int32Array;
  readonly highway: Uint8Array;
  readonly landValue: Float32Array;
  readonly entrance: number;

  readonly b = new Buildings();
  readonly c = new Citizens();
  readonly roads: RoadGraph;

  /** Bumped whenever tiles, zones or roads change. */
  structVersion = 1;
  /** Bumped whenever building visuals change (new, level, construction step). */
  bldVersion = 1;

  playerBld = -1;
  pop = 0;
  employed = 0;
  jobs = 0;
  happiness = 50;
  factors: HappinessFactors = { base: 30, lavoro: 0, parchi: 0, negozi: 0, tragitto: 0, inquinamento: 0 };
  demand: Demand = { r: 0, c: 0, i: 0 };
  business!: BusinessState;
  ledger: LedgerDay[] = [];

  events: GameEvent[] = [];
  private undoStack: UndoEntry[] = [];
  private redoStack: PaintCmd[] = [];
  private landDirty = true;
  private milestones = new Set<number>();
  private parkNear: Uint8Array;
  private shopNear: Uint8Array;
  private pollution: Uint8Array;
  private jobCursor = 0;

  constructor(seed: number, archetypeId: string, size = MAP_SIZE) {
    this.seed = seed >>> 0;
    this.size = size;
    this.rng = new Rng(this.seed ^ 0x9e3779b9);
    this.archetype = archetypeById(archetypeId);
    const map = generateMap(this.seed, size);
    this.cityName = map.cityName;
    const n = size * size;
    this.terrain = map.terrain;
    this.use = new Uint8Array(n);
    this.zone = new Uint8Array(n);
    this.bldAt = new Int32Array(n).fill(-1);
    this.highway = new Uint8Array(n);
    this.landValue = new Float32Array(n);
    this.parkNear = new Uint8Array(n);
    this.shopNear = new Uint8Array(n);
    this.pollution = new Uint8Array(n);
    this.entrance = map.entrance;
    for (const t of map.highway) {
      this.use[t] = TileUse.Road;
      this.highway[t] = 1;
    }
    this.roads = new RoadGraph(size, (i) => this.use[i] === TileUse.Road);
    this.roads.rebuild();

    const pb = this.b.add(map.startLot, BKind.Player, 0);
    this.b.progress[pb] = 1;
    this.b.capacity[pb] = this.archetype.posti;
    this.use[map.startLot] = TileUse.Building;
    this.bldAt[map.startLot] = pb;
    this.b.access[pb] = this.findAccess(map.startLot);
    this.playerBld = pb;
    const band = bandFor(this.archetype.investimento);
    this.business = {
      archetipo: this.archetype.id,
      tile: map.startLot,
      investimento: this.archetype.investimento,
      rientroBersaglio: band.rientroGiorni,
      fascia: band.nome,
      dipendenti: 0,
      posti: this.archetype.posti,
      bacino: 0,
      passaggioOggi: 0,
      visiteOggi: 0,
      concorrenti: 0,
      stimaOggi: { clienti: 0, entrate: 0, uscite: 0, profitto: 0 },
      storico: [],
      incassatoTotale: 0,
    };
    this.emit('evt.opened', { nome: this.archetype.nome }, map.startLot);
    this.updateLand();
  }

  // ---------------------------------------------------------------- helpers

  get day(): number {
    return Math.floor(this.tick / TICKS_PER_DAY) + 1;
  }

  get timeOfDay(): number {
    return this.tick % TICKS_PER_DAY;
  }

  private emit(key: string, params?: Record<string, string | number>, tile?: number): void {
    this.events.push({ tick: this.tick, key, params, tile });
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private xy(i: number): [number, number] {
    const x = i % this.size;
    return [x, (i - x) / this.size];
  }

  /** Nearest road within 2 tiles (Manhattan), scanned in a fixed order. */
  findAccess(tile: number): number {
    const [x, y] = this.xy(tile);
    let best = -1;
    let bestD = 99;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d > 2 || d >= bestD) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) continue;
        const i = ny * this.size + nx;
        if (this.use[i] === TileUse.Road) {
          best = i;
          bestD = d;
        }
      }
    }
    return best;
  }

  private reachable(access: number): boolean {
    return this.roads.connected(access, this.entrance);
  }

  // ---------------------------------------------------------------- commands

  apply(cmd: Command): void {
    if (cmd.t === 'paint') {
      const entry = this.paint(cmd);
      if (entry) {
        this.undoStack.push(entry);
        if (this.undoStack.length > 200) this.undoStack.shift();
        this.redoStack = [];
      }
    } else if (cmd.t === 'undo') {
      this.undo();
    } else if (cmd.t === 'redo') {
      const next = this.redoStack.pop();
      if (next) {
        const entry = this.paint(next);
        if (entry) this.undoStack.push(entry);
      }
    }
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Cost of painting these tiles now, without applying (for the ghost preview). */
  previewCost(tool: Tool, tiles: number[]): { cost: number; valid: number } {
    let cost = 0;
    let valid = 0;
    for (const t of new Set(tiles)) {
      const c = this.tileCost(tool, t);
      if (c >= 0) {
        cost += c;
        valid++;
      }
    }
    return { cost, valid };
  }

  /** -1 when the tool cannot act on this tile. */
  tileCost(tool: Tool, t: number): number {
    const use = this.use[t];
    const water = this.terrain[t] === Terrain.Water;
    switch (tool) {
      case 'road':
        if (use !== TileUse.Empty) return -1;
        return water ? COSTS.bridge : COSTS.road;
      case 'res':
      case 'com':
      case 'ind': {
        const z = tool === 'res' ? Zone.Res : tool === 'com' ? Zone.Com : Zone.Ind;
        if (use !== TileUse.Empty || water || this.zone[t] === z) return -1;
        return COSTS.zone;
      }
      case 'park':
        if (use !== TileUse.Empty || water) return -1;
        return COSTS.park;
      case 'bulldoze':
        if (this.highway[t]) return -1;
        if (use === TileUse.Building && this.bldAt[t] === this.playerBld) return -1;
        if (use === TileUse.Empty && this.zone[t] === Zone.None) return -1;
        return COSTS.bulldoze;
    }
  }

  private paint(cmd: PaintCmd): UndoEntry | null {
    const entry: UndoEntry = { cmd, tiles: [], prevUse: [], prevZone: [], prevTerrain: [], cost: 0 };
    let roadsChanged = false;
    let broke = false;
    for (const t of new Set(cmd.tiles)) {
      if (t < 0 || t >= this.use.length) continue;
      const cost = this.tileCost(cmd.tool, t);
      if (cost < 0) continue;
      if (this.money < cost) {
        broke = true;
        break;
      }
      entry.tiles.push(t);
      entry.prevUse.push(this.use[t]);
      entry.prevZone.push(this.zone[t]);
      entry.prevTerrain.push(this.terrain[t]);
      entry.cost += cost;
      this.money -= cost;
      if (this.terrain[t] === Terrain.Forest) this.terrain[t] = Terrain.Grass;
      switch (cmd.tool) {
        case 'road':
          this.use[t] = TileUse.Road;
          this.zone[t] = Zone.None;
          roadsChanged = true;
          break;
        case 'res':
          this.zone[t] = Zone.Res;
          break;
        case 'com':
          this.zone[t] = Zone.Com;
          break;
        case 'ind':
          this.zone[t] = Zone.Ind;
          break;
        case 'park':
          this.use[t] = TileUse.Park;
          this.zone[t] = Zone.None;
          break;
        case 'bulldoze':
          if (this.use[t] === TileUse.Building) this.demolish(this.bldAt[t]);
          if (this.use[t] === TileUse.Road) roadsChanged = true;
          this.use[t] = TileUse.Empty;
          this.zone[t] = Zone.None;
          break;
      }
    }
    if (broke) this.emit('evt.noMoney');
    if (entry.tiles.length === 0) return null;
    this.afterStructChange(roadsChanged);
    return entry;
  }

  private undo(): void {
    const e = this.undoStack.pop();
    if (!e) return;
    let roadsChanged = false;
    for (let k = e.tiles.length - 1; k >= 0; k--) {
      const t = e.tiles[k];
      if (this.use[t] === TileUse.Building) {
        if (this.bldAt[t] === this.playerBld) continue;
        this.demolish(this.bldAt[t]);
      }
      if (this.use[t] === TileUse.Road || e.prevUse[k] === TileUse.Road) roadsChanged = true;
      // A demolished building is not rebuilt: its lot goes back to its zone.
      this.use[t] = e.prevUse[k] === TileUse.Building ? TileUse.Empty : e.prevUse[k];
      this.zone[t] = e.prevZone[k];
      this.terrain[t] = e.prevTerrain[k];
    }
    this.money += e.cost;
    this.redoStack.push(e.cmd);
    this.afterStructChange(roadsChanged);
  }

  private afterStructChange(roadsChanged: boolean): void {
    if (roadsChanged) {
      this.roads.rebuild();
      for (let id = 0; id < this.b.count; id++) {
        if (this.b.alive[id]) this.b.access[id] = this.findAccess(this.b.tile[id]);
      }
    }
    this.structVersion++;
    this.bldVersion++;
    this.landDirty = true;
  }

  private demolish(id: number): void {
    if (id < 0 || !this.b.alive[id] || id === this.playerBld) return;
    const c = this.c;
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i]) continue;
      if (c.home[i] === id) {
        c.remove(i);
        this.pop--;
        continue;
      }
      if (c.work[i] === id) {
        c.work[i] = -1;
        c.jobless[i] = this.tick;
        this.employed--;
        if (c.state[i] === CState.Work) this.goTo(i, c.home[i], Purpose.ToHome);
      }
      if (c.dest[i] === id && c.state[i] === CState.Moving) this.goTo(i, c.home[i], Purpose.ToHome);
      if (c.dest[i] === id && c.state[i] === CState.Shop) this.goTo(i, c.home[i], Purpose.ToHome);
    }
    const t = this.b.tile[id];
    this.bldAt[t] = -1;
    this.use[t] = TileUse.Empty;
    this.b.remove(id);
  }

  // ---------------------------------------------------------------- tick

  step(): void {
    this.tick++;
    const tod = this.timeOfDay;
    this.construction();
    this.moveCitizens();
    if (this.tick % 20 === 0) {
      if (this.landDirty) this.updateLand();
      this.computeDemand();
      this.grow();
    }
    if (this.tick % 10 === 0) this.immigrate();
    this.findJobs(40);
    if (this.tick % 300 === 0) this.levelUp();
    if (tod % TICKS_PER_HOUR === 0) this.updateHappiness();
    if (tod % TICKS_PER_HOUR === 0) this.estimateBusiness();
    if (tod === 0) this.endOfDay();
  }

  private construction(): void {
    const b = this.b;
    for (let id = 0; id < b.count; id++) {
      if (!b.alive[id] || b.progress[id] >= 1) continue;
      const before = Math.floor(b.progress[id] * 10);
      b.progress[id] = Math.min(1, b.progress[id] + 1 / CONSTRUCTION_TICKS);
      if (Math.floor(b.progress[id] * 10) !== before) this.bldVersion++;
      if (b.progress[id] >= 1) {
        b.capacity[id] = CAPACITY[b.kind[id]][b.level[id]];
        if (b.level[id] === 1) {
          const key = b.kind[id] === BKind.Res ? 'evt.newHome' : b.kind[id] === BKind.Com ? 'evt.newShop' : 'evt.newFactory';
          if (this.rng.chance(0.25) || this.countKind(b.kind[id]) <= 1) this.emit(key, undefined, b.tile[id]);
        }
      }
    }
  }

  private countKind(kind: number): number {
    let n = 0;
    for (let id = 0; id < this.b.count; id++) if (this.b.alive[id] && this.b.kind[id] === kind) n++;
    return n;
  }

  private computeDemand(): void {
    const b = this.b;
    let housing = 0;
    let comJobs = 0;
    let indJobs = 0;
    let jobs = 0;
    for (let id = 0; id < b.count; id++) {
      if (!b.alive[id]) continue;
      const planned = b.progress[id] >= 1 ? b.capacity[id] : CAPACITY[b.kind[id]]?.[b.level[id]] ?? b.capacity[id];
      if (b.kind[id] === BKind.Res) housing += planned;
      else {
        if (b.kind[id] === BKind.Com) comJobs += planned;
        if (b.kind[id] === BKind.Ind) indJobs += planned;
        if (b.progress[id] >= 1) jobs += b.capacity[id];
      }
    }
    this.jobs = jobs;
    const pop = this.pop;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const plannedJobs = comJobs + indJobs + this.archetype.posti;
    const wantPeople = plannedJobs / WORKER_SHARE + 10;
    // Exports to the rest of the world grow with time, so industry always has some demand.
    const exports = 10 + 8 * this.day;
    this.demand = {
      r: clamp((wantPeople - housing) / Math.max(12, housing * 0.3)),
      c: clamp((pop * 0.2 + 4 - comJobs) / Math.max(6, comJobs * 0.5)),
      i: clamp((pop * 0.25 + exports - indJobs) / Math.max(8, indJobs * 0.5)),
    };
  }

  private grow(): void {
    const cand: number[][] = [[], [], [], []];
    const n = this.size * this.size;
    for (let t = 0; t < n; t++) {
      const z = this.zone[t];
      if (z === Zone.None || this.use[t] !== TileUse.Empty) continue;
      const acc = this.findAccess(t);
      if (acc < 0 || !this.reachable(acc)) continue;
      cand[z].push(t);
    }
    const tryZone = (z: Zone, d: number, kind: BKind) => {
      const list = cand[z];
      if (d <= 0.05 || list.length === 0 || !this.rng.chance(Math.min(0.9, d))) return;
      // Best of three random lots by land value (residential and commercial) or lowest (industry).
      let pick = list[this.rng.int(0, list.length - 1)];
      for (let k = 0; k < 2; k++) {
        const o = list[this.rng.int(0, list.length - 1)];
        const better = kind === BKind.Ind ? this.landValue[o] < this.landValue[pick] : this.landValue[o] > this.landValue[pick];
        if (better) pick = o;
      }
      const id = this.b.add(pick, kind, this.rng.int(0, 7));
      this.b.access[id] = this.findAccess(pick);
      this.use[pick] = TileUse.Building;
      this.bldAt[pick] = id;
      this.structVersion++;
      this.bldVersion++;
      this.landDirty = true;
    };
    tryZone(Zone.Res, this.demand.r, BKind.Res);
    tryZone(Zone.Com, this.demand.c, BKind.Com);
    tryZone(Zone.Ind, this.demand.i, BKind.Ind);
  }

  private immigrate(): void {
    const target = this.jobs / WORKER_SHARE + 10;
    if (this.pop >= target) return;
    if (!this.rng.chance(0.3 + this.happiness / 200)) return;
    const b = this.b;
    const free: number[] = [];
    for (let id = 0; id < b.count; id++) {
      if (b.kind[id] === BKind.Res && b.isActive(id) && b.occ[id] < b.capacity[id] && b.access[id] >= 0 && this.reachable(b.access[id])) free.push(id);
    }
    if (free.length === 0) return;
    const home = free[this.rng.int(0, free.length - 1)];
    const id = this.c.add(home, this.rng.int(-300, 600), this.rng.range(-0.28, 0.28), this.tick, this.rng.chance(WORKER_SHARE));
    b.occ[home]++;
    this.pop++;
    // Newcomers walk in from the highway (Part 4.1).
    const path = this.roads.path(this.entrance, b.access[home]);
    this.startPath(id, path, home, Purpose.ToHome);
    if (this.pop === 1) this.emit('evt.firstFamily', undefined, b.tile[home]);
    for (const m of [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
      if (this.pop >= m && !this.milestones.has(m)) {
        this.milestones.add(m);
        this.emit('evt.milestone', { n: m });
      }
    }
  }

  private findJobs(limit: number): void {
    const c = this.c;
    const b = this.b;
    if (c.count === 0) return;
    let checked = 0;
    for (let k = 0; k < c.count && checked < limit; k++) {
      const i = (this.jobCursor + k) % c.count;
      if (!c.alive[i] || c.work[i] !== -1 || !c.worker[i]) continue;
      checked++;
      const ha = b.access[c.home[i]];
      if (ha < 0) continue;
      const [hx, hy] = this.xy(b.tile[c.home[i]]);
      let best = -1;
      let bestD = Infinity;
      for (let id = 0; id < b.count; id++) {
        if (b.kind[id] === BKind.Res || !b.isActive(id) || b.occ[id] >= b.capacity[id]) continue;
        if (!this.roads.connected(ha, b.access[id])) continue;
        const [x, y] = this.xy(b.tile[id]);
        const d = Math.abs(x - hx) + Math.abs(y - hy) + (id === this.playerBld ? -4 : 0);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
      if (best >= 0) {
        c.work[i] = best;
        b.occ[best]++;
        this.employed++;
        if (best === this.playerBld) this.business.dipendenti = b.occ[best];
      }
    }
    this.jobCursor = (this.jobCursor + limit) % Math.max(1, c.count);
  }

  private levelUp(): void {
    const b = this.b;
    for (let id = 0; id < b.count; id++) {
      if (!b.isActive(id) || b.kind[id] === BKind.Player || b.level[id] >= 3) continue;
      if (b.occ[id] < b.capacity[id]) continue;
      const lv = this.landValue[b.tile[id]];
      const lvl = b.level[id];
      const ok =
        b.kind[id] === BKind.Ind
          ? lvl === 1 && this.pop > 150
          : (lvl === 1 && lv > 0.5 && this.pop > 60) || (lvl === 2 && lv > 0.68 && this.pop > 300);
      if (!ok || !this.rng.chance(0.3)) continue;
      b.level[id] = lvl + 1;
      b.capacity[id] = CAPACITY[b.kind[id]][lvl + 1];
      b.progress[id] = 0.7;
      this.bldVersion++;
      this.emit('evt.levelUp', { livello: lvl + 1 }, b.tile[id]);
    }
  }

  // ---------------------------------------------------------------- citizens

  private startPath(i: number, path: Int32Array | null, dest: number, purpose: Purpose): void {
    const c = this.c;
    c.dest[i] = dest;
    c.purpose[i] = purpose;
    if (!path || path.length < 2) {
      this.arrive(i);
      return;
    }
    c.paths[i] = path;
    c.pathPos[i] = 0;
    c.state[i] = CState.Moving;
    const [x, y] = this.xy(path[0]);
    c.x[i] = x;
    c.y[i] = y;
  }

  private goTo(i: number, dest: number, purpose: Purpose): void {
    const c = this.c;
    const b = this.b;
    const from = c.state[i] === CState.Home ? b.access[c.home[i]] : c.state[i] === CState.Moving ? this.currentTile(i) : b.access[c.dest[i]];
    const to = b.access[dest];
    this.startPath(i, from >= 0 && to >= 0 ? this.roads.path(from, to) : null, dest, purpose);
  }

  private currentTile(i: number): number {
    const p = this.c.paths[i];
    if (!p) return -1;
    return p[Math.min(p.length - 1, Math.round(this.c.pathPos[i]))];
  }

  private arrive(i: number): void {
    const c = this.c;
    c.paths[i] = null;
    const dayStart = this.tick - this.timeOfDay;
    switch (c.purpose[i]) {
      case Purpose.ToHome: {
        c.state[i] = CState.Home;
        let next = dayStart + 7 * TICKS_PER_HOUR + c.offset[i];
        if (c.work[i] === -1) next = dayStart + 10 * TICKS_PER_HOUR + c.offset[i] * 3;
        if (next <= this.tick) next += TICKS_PER_DAY;
        c.nextAct[i] = next;
        break;
      }
      case Purpose.ToWork: {
        c.state[i] = CState.Work;
        let next = dayStart + 17 * TICKS_PER_HOUR + c.offset[i];
        if (next <= this.tick) next = this.tick + 8 * TICKS_PER_HOUR;
        c.nextAct[i] = next;
        break;
      }
      case Purpose.ToShop: {
        c.state[i] = CState.Shop;
        this.b.visits[c.dest[i]]++;
        if (c.dest[i] === this.playerBld) this.business.visiteOggi++;
        c.nextAct[i] = this.tick + this.rng.int(300, 900);
        break;
      }
    }
  }

  private pickShop(i: number): number {
    const b = this.b;
    const ha = b.access[this.c.home[i]];
    if (ha < 0) return -1;
    const [hx, hy] = this.xy(b.tile[this.c.home[i]]);
    let best = -1;
    let bestScore = Infinity;
    for (let id = 0; id < b.count; id++) {
      if ((b.kind[id] !== BKind.Com && b.kind[id] !== BKind.Player) || !b.isActive(id)) continue;
      if (!this.roads.connected(ha, b.access[id])) continue;
      const [x, y] = this.xy(b.tile[id]);
      const score = Math.abs(x - hx) + Math.abs(y - hy) + this.rng.next() * 12;
      if (score < bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }

  private moveCitizens(): void {
    const c = this.c;
    const pAccess = this.b.access[this.playerBld];
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i]) continue;
      const st = c.state[i];
      if (st === CState.Moving) {
        const p = c.paths[i];
        if (!p) {
          this.arrive(i);
          continue;
        }
        const before = Math.floor(c.pathPos[i]);
        c.pathPos[i] += WALK_SPEED;
        const k = Math.floor(c.pathPos[i]);
        if (k !== before && p[k] === pAccess) this.business.passaggioOggi++;
        if (c.pathPos[i] >= p.length - 1) {
          this.arrive(i);
          continue;
        }
        const f = c.pathPos[i] - k;
        const a = p[k];
        const bb = p[k + 1];
        const ax = a % this.size;
        const ay = (a - ax) / this.size;
        const bx = bb % this.size;
        const by = (bb - bx) / this.size;
        // Walk on one side of the road: offset perpendicular to the direction.
        const dx = bx - ax;
        const dy = by - ay;
        c.x[i] = ax + dx * f - dy * c.lane[i];
        c.y[i] = ay + dy * f + dx * c.lane[i];
        continue;
      }
      if (this.tick < c.nextAct[i]) continue;
      if (st === CState.Home) {
        if (c.work[i] >= 0) this.goTo(i, c.work[i], Purpose.ToWork);
        else {
          const shop = this.pickShop(i);
          if (shop >= 0 && this.rng.chance(0.6)) this.goTo(i, shop, Purpose.ToShop);
          else c.nextAct[i] = this.tick + TICKS_PER_DAY;
        }
      } else if (st === CState.Work) {
        const shop = this.rng.chance(0.4) ? this.pickShop(i) : -1;
        if (shop >= 0) this.goTo(i, shop, Purpose.ToShop);
        else this.goTo(i, c.home[i], Purpose.ToHome);
      } else if (st === CState.Shop) {
        this.goTo(i, c.home[i], Purpose.ToHome);
      }
    }
  }

  // ---------------------------------------------------------------- land & happiness

  private stamp(arr: Uint8Array, tile: number, r: number, add: number): void {
    const [x, y] = this.xy(tile);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.size || ny >= this.size) continue;
        const i = ny * this.size + nx;
        arr[i] = Math.min(255, arr[i] + add);
      }
    }
  }

  private updateLand(): void {
    this.landDirty = false;
    this.parkNear.fill(0);
    this.shopNear.fill(0);
    this.pollution.fill(0);
    const water = new Uint8Array(this.size * this.size);
    const n = this.size * this.size;
    for (let t = 0; t < n; t++) {
      if (this.use[t] === TileUse.Park) this.stamp(this.parkNear, t, 4, 1);
      if (this.terrain[t] === Terrain.Water) this.stamp(water, t, 2, 1);
    }
    const b = this.b;
    for (let id = 0; id < b.count; id++) {
      if (!b.alive[id]) continue;
      if (b.kind[id] === BKind.Com || b.kind[id] === BKind.Player) this.stamp(this.shopNear, b.tile[id], 6, 1);
      if (b.kind[id] === BKind.Ind) this.stamp(this.pollution, b.tile[id], 3, 1);
    }
    for (let t = 0; t < n; t++) {
      const v =
        0.3 +
        Math.min(0.3, this.parkNear[t] * 0.06) +
        (water[t] > 0 ? 0.12 : 0) +
        Math.min(0.2, this.shopNear[t] * 0.04) -
        Math.min(0.4, this.pollution[t] * 0.1) +
        (this.terrain[t] === Terrain.Forest ? 0.05 : 0);
      this.landValue[t] = Math.max(0, Math.min(1, v));
    }
  }

  private updateHappiness(): void {
    const c = this.c;
    const b = this.b;
    const sum: HappinessFactors = { base: 0, lavoro: 0, parchi: 0, negozi: 0, tragitto: 0, inquinamento: 0 };
    let total = 0;
    let n = 0;
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i]) continue;
      const ht = b.tile[c.home[i]];
      const f: HappinessFactors = {
        base: 30,
        lavoro: c.work[i] >= 0 || !c.worker[i] ? 30 : this.tick - c.jobless[i] > TICKS_PER_DAY ? -10 : 5,
        parchi: this.parkNear[ht] > 0 ? 15 : 0,
        negozi: this.shopNear[ht] > 0 ? 15 : 0,
        tragitto: 0,
        inquinamento: -Math.min(25, this.pollution[ht] * 12),
      };
      if (c.work[i] >= 0) {
        const [hx, hy] = this.xy(ht);
        const [wx, wy] = this.xy(b.tile[c.work[i]]);
        const d = Math.abs(hx - wx) + Math.abs(hy - wy);
        f.tragitto = d < 12 ? 10 : d < 25 ? 5 : -5;
      }
      const h = Math.max(0, Math.min(100, f.base + f.lavoro + f.parchi + f.negozi + f.tragitto + f.inquinamento));
      c.happy[i] = h;
      total += h;
      n++;
      sum.base += f.base;
      sum.lavoro += f.lavoro;
      sum.parchi += f.parchi;
      sum.negozi += f.negozi;
      sum.tragitto += f.tragitto;
      sum.inquinamento += f.inquinamento;
    }
    if (n === 0) return;
    this.happiness = Math.round(total / n);
    this.factors = {
      base: sum.base / n,
      lavoro: sum.lavoro / n,
      parchi: sum.parchi / n,
      negozi: sum.negozi / n,
      tragitto: sum.tragitto / n,
      inquinamento: sum.inquinamento / n,
    };
  }

  // ---------------------------------------------------------------- business & money

  private catchment(): { bacino: number; concorrenti: number } {
    const b = this.b;
    const [px, py] = this.xy(this.business.tile);
    let people = 0;
    let comp = 0;
    for (let id = 0; id < b.count; id++) {
      if (!b.alive[id] || id === this.playerBld) continue;
      const [x, y] = this.xy(b.tile[id]);
      const d = Math.abs(x - px) + Math.abs(y - py);
      if (b.kind[id] === BKind.Res && d <= 12) people += b.occ[id];
      if (b.kind[id] === BKind.Com && b.isActive(id) && d <= 6) comp++;
    }
    const bus = this.business;
    return { bacino: people + bus.visiteOggi * 2 + Math.round(bus.passaggioOggi * 0.5), concorrenti: comp };
  }

  private estimateBusiness(): void {
    const { bacino, concorrenti } = this.catchment();
    const bus = this.business;
    bus.bacino = bacino;
    bus.concorrenti = concorrenti;
    bus.dipendenti = this.b.occ[this.playerBld];
    bus.stimaOggi = businessDay(this.archetype, bacino, concorrenti, bus.dipendenti / Math.max(1, bus.posti));
  }

  private endOfDay(): void {
    if (this.tick === 0) return;
    this.estimateBusiness();
    const bus = this.business;
    const result = bus.stimaOggi;
    let roads = 0;
    let parks = 0;
    for (let t = 0; t < this.use.length; t++) {
      if (this.use[t] === TileUse.Road && !this.highway[t]) roads++;
      if (this.use[t] === TileUse.Park) parks++;
    }
    const tasse = this.pop * TAX_PER_DAY.resident + this.employed * TAX_PER_DAY.worker;
    const manutenzione = roads * UPKEEP_PER_DAY.road + parks * UPKEEP_PER_DAY.park;
    const saldo = tasse - manutenzione + result.profitto;
    this.money += saldo;
    bus.storico.push(result);
    if (bus.storico.length > 30) bus.storico.shift();
    bus.incassatoTotale += result.profitto;
    bus.passaggioOggi = 0;
    bus.visiteOggi = 0;
    for (let id = 0; id < this.b.count; id++) this.b.visits[id] = 0;
    const giorno = this.day - 1;
    this.ledger.push({ giorno, tasse, manutenzione, business: result.profitto, saldo });
    if (this.ledger.length > 30) this.ledger.shift();
    this.emit('evt.dayReport', { giorno, saldo: Math.round(saldo), clienti: result.clienti });
    this.emigrate();
  }

  private emigrate(): void {
    const c = this.c;
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i] || c.work[i] >= 0 || !c.worker[i]) continue;
      if (this.tick - c.jobless[i] > 2 * TICKS_PER_DAY && c.happy[i] < 40 && this.rng.chance(0.5)) {
        this.b.occ[c.home[i]]--;
        c.remove(i);
        this.pop--;
      }
    }
  }

  // ---------------------------------------------------------------- determinism & saves

  /** FNV-1a over the whole simulation state. Same seed + same commands = same hash. */
  hash(): string {
    let h = 2166136261;
    const mix = (v: number) => {
      h ^= v & 0xff;
      h = Math.imul(h, 16777619);
      h ^= (v >>> 8) & 0xff;
      h = Math.imul(h, 16777619);
      h ^= (v >>> 16) & 0xff;
      h = Math.imul(h, 16777619);
      h ^= (v >>> 24) & 0xff;
      h = Math.imul(h, 16777619);
    };
    mix(this.tick);
    mix(Math.round(this.money));
    mix(this.rng.state);
    mix(this.pop);
    for (let i = 0; i < this.use.length; i++) mix(this.use[i] | (this.zone[i] << 4) | (this.terrain[i] << 8));
    for (let id = 0; id < this.b.count; id++) {
      mix(this.b.alive[id] ? this.b.tile[id] : -1);
      mix(this.b.level[id] | (this.b.kind[id] << 4) | (this.b.occ[id] << 8));
    }
    for (let i = 0; i < this.c.count; i++) {
      mix(this.c.alive[i] ? this.c.home[i] : -1);
      mix(this.c.work[i]);
      mix(this.c.state[i]);
      mix(Math.round(this.c.x[i] * 100));
      mix(Math.round(this.c.y[i] * 100));
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  serialize(): SaveData {
    const b = this.b;
    const c = this.c;
    const n = b.count;
    const m = c.count;
    return {
      version: SAVE_VERSION,
      seed: this.seed,
      archetype: this.archetype.id,
      tick: this.tick,
      money: this.money,
      rng: this.rng.state,
      terrain: this.terrain.slice(),
      use: this.use.slice(),
      zone: this.zone.slice(),
      bldAt: this.bldAt.slice(),
      buildings: {
        count: n,
        tile: b.tile.slice(0, n),
        kind: b.kind.slice(0, n),
        level: b.level.slice(0, n),
        variant: b.variant.slice(0, n),
        progress: b.progress.slice(0, n),
        capacity: b.capacity.slice(0, n),
        occ: b.occ.slice(0, n),
        alive: b.alive.slice(0, n),
      },
      citizens: {
        count: m,
        alive: c.alive.slice(0, m),
        home: c.home.slice(0, m),
        work: c.work.slice(0, m),
        state: c.state.slice(0, m),
        purpose: c.purpose.slice(0, m),
        dest: c.dest.slice(0, m),
        offset: c.offset.slice(0, m),
        lane: c.lane.slice(0, m),
        happy: c.happy.slice(0, m),
        jobless: c.jobless.slice(0, m),
        worker: c.worker.slice(0, m),
      },
      business: structuredClone(this.business),
      ledger: structuredClone(this.ledger),
      milestones: [...this.milestones],
    };
  }

  static deserialize(s: SaveData): World {
    if (s.version !== SAVE_VERSION) throw new Error(`Versione salvataggio non supportata: ${s.version}`);
    const w = new World(s.seed, s.archetype, Math.round(Math.sqrt(s.use.length)));
    w.tick = s.tick;
    w.money = s.money;
    w.rng.state = s.rng;
    w.terrain.set(s.terrain);
    w.use.set(s.use);
    w.zone.set(s.zone);
    w.bldAt.set(s.bldAt);
    w.events = [];
    const b = w.b;
    b.ensure(s.buildings.count);
    b.count = s.buildings.count;
    b.tile.set(s.buildings.tile);
    b.kind.set(s.buildings.kind);
    b.level.set(s.buildings.level);
    b.variant.set(s.buildings.variant);
    b.progress.set(s.buildings.progress);
    b.capacity.set(s.buildings.capacity);
    b.occ.set(s.buildings.occ);
    b.alive.set(s.buildings.alive);
    b.reindexFree();
    const c = w.c;
    c.ensure(s.citizens.count);
    c.count = s.citizens.count;
    c.alive.set(s.citizens.alive);
    c.home.set(s.citizens.home);
    c.work.set(s.citizens.work);
    c.state.set(s.citizens.state);
    c.purpose.set(s.citizens.purpose);
    c.dest.set(s.citizens.dest);
    c.offset.set(s.citizens.offset);
    c.lane.set(s.citizens.lane);
    c.happy.set(s.citizens.happy);
    c.jobless.set(s.citizens.jobless);
    c.worker.set(s.citizens.worker);
    c.reindexFree();
    w.business = s.business;
    w.ledger = s.ledger;
    s.milestones.forEach((m) => w.milestones.add(m));
    w.roads.rebuild();
    w.pop = 0;
    w.employed = 0;
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i]) continue;
      w.pop++;
      if (c.work[i] >= 0) w.employed++;
      // Paths are not saved: anyone walking arrives at once.
      if (c.state[i] === CState.Moving) {
        c.paths[i] = null;
        w.arrive(i);
      }
    }
    for (let id = 0; id < b.count; id++) if (b.alive[id]) b.access[id] = w.findAccess(b.tile[id]);
    w.afterStructChange(true);
    w.updateLand();
    w.computeDemand();
    w.updateHappiness();
    return w;
  }
}

export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  seed: number;
  archetype: string;
  tick: number;
  money: number;
  rng: number;
  terrain: Uint8Array;
  use: Uint8Array;
  zone: Uint8Array;
  bldAt: Int32Array;
  buildings: {
    count: number;
    tile: Int32Array;
    kind: Uint8Array;
    level: Uint8Array;
    variant: Uint8Array;
    progress: Float32Array;
    capacity: Int16Array;
    occ: Int16Array;
    alive: Uint8Array;
  };
  citizens: {
    count: number;
    alive: Uint8Array;
    home: Int32Array;
    work: Int32Array;
    state: Uint8Array;
    purpose: Uint8Array;
    dest: Int32Array;
    offset: Int16Array;
    lane: Float32Array;
    happy: Uint8Array;
    jobless: Int32Array;
    worker: Uint8Array;
  };
  business: BusinessState;
  ledger: LedgerDay[];
  milestones: number[];
}
