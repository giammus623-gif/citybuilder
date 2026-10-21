/// <reference lib="webworker" />
import { BKind, CState, TICKS_PER_SECOND, TileUse } from './constants';
import type { FromWorker, Snapshot, TileInfo, ToWorker } from './protocol';
import { B_STRIDE } from './protocol';
import { World } from './world';

declare const self: DedicatedWorkerGlobalScope;

let world: World | null = null;
let speed = 1;
let lastStruct = -1;
let lastBld = -1;
let tickMs = 0;
// Backpressure: never queue snapshots faster than the main thread can draw them.
let awaitingAck = false;

function post(msg: FromWorker, transfer: Transferable[] = []): void {
  self.postMessage(msg, transfer);
}

function snapshot(force = false): void {
  if (!world || (awaitingAck && !force)) return;
  awaitingAck = true;
  const w = world;
  const people = new Float32Array(w.c.count * 2);
  for (let i = 0; i < w.c.count; i++) {
    const moving = w.c.alive[i] && w.c.state[i] === CState.Moving;
    people[i * 2] = moving ? w.c.x[i] : NaN;
    people[i * 2 + 1] = moving ? w.c.y[i] : NaN;
  }
  const snap: Snapshot = {
    tick: w.tick,
    day: w.day,
    timeOfDay: w.timeOfDay,
    speed,
    cityName: w.cityName,
    seed: w.seed,
    money: w.money,
    pop: w.pop,
    employed: w.employed,
    jobs: w.jobs,
    happiness: w.happiness,
    factors: w.factors,
    demand: w.demand,
    business: w.business,
    lastDay: w.ledger[w.ledger.length - 1] ?? null,
    canUndo: w.canUndo,
    canRedo: w.canRedo,
    tickMs,
    people,
    events: w.drainEvents(),
  };
  const transfer: Transferable[] = [people.buffer];
  if (w.structVersion !== lastStruct) {
    lastStruct = w.structVersion;
    snap.grid = {
      size: w.size,
      terrain: w.terrain.slice(),
      use: w.use.slice(),
      zone: w.zone.slice(),
      highway: w.highway.slice(),
      landValue: w.landValue.slice(),
    };
  }
  if (w.bldVersion !== lastBld) {
    lastBld = w.bldVersion;
    const b = w.b;
    const out = new Float32Array(b.count * B_STRIDE);
    let n = 0;
    for (let id = 0; id < b.count; id++) {
      if (!b.alive[id]) continue;
      out.set(
        [
          b.tile[id],
          b.kind[id],
          b.level[id],
          b.variant[id],
          b.progress[id],
          b.occ[id],
          b.capacity[id],
          id,
        ],
        n * B_STRIDE,
      );
      n++;
    }
    snap.buildings = out.slice(0, n * B_STRIDE);
    transfer.push(snap.buildings.buffer);
  }
  post({ type: 'snapshot', snap }, transfer);
}

function inspect(tile: number): TileInfo {
  const w = world!;
  const id = w.use[tile] === TileUse.Building ? w.bldAt[tile] : -1;
  let happiness: number | null = null;
  if (id >= 0 && w.b.kind[id] === BKind.Res) {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < w.c.count; i++) {
      if (w.c.alive[i] && w.c.home[i] === id) {
        sum += w.c.happy[i];
        n++;
      }
    }
    happiness = n ? Math.round(sum / n) : null;
  }
  return {
    tile,
    use: w.use[tile],
    zone: w.zone[tile],
    landValue: w.landValue[tile],
    building:
      id < 0
        ? null
        : {
            id,
            kind: w.b.kind[id],
            level: w.b.level[id],
            progress: w.b.progress[id],
            occ: w.b.occ[id],
            capacity: w.b.capacity[id],
            happiness,
            visits: w.b.visits[id],
            player: id === w.playerBld,
          },
  };
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  try {
    switch (m.type) {
      case 'new':
        world = new World(m.seed, m.archetype);
        lastStruct = lastBld = -1;
        snapshot(true);
        break;
      case 'load':
        world = World.deserialize(m.save);
        lastStruct = lastBld = -1;
        snapshot(true);
        break;
      case 'cmd':
        // Commands are applied between ticks, so replays stay deterministic.
        world?.apply(m.cmd);
        if (speed === 0) snapshot(true);
        break;
      case 'ack':
        awaitingAck = false;
        break;
      case 'speed':
        speed = m.speed;
        snapshot(true);
        break;
      case 'save':
        if (world) post({ type: 'saved', requestId: m.requestId, save: world.serialize() });
        break;
      case 'preview':
        if (world)
          post({ type: 'preview', requestId: m.requestId, ...world.previewCost(m.tool, m.tiles) });
        break;
      case 'inspect':
        if (world) post({ type: 'inspect', requestId: m.requestId, info: inspect(m.tile) });
        break;
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};

setInterval(() => {
  if (!world || speed === 0) return;
  const t0 = performance.now();
  for (let k = 0; k < speed; k++) world.step();
  tickMs = (performance.now() - t0) / speed;
  snapshot();
}, 1000 / TICKS_PER_SECOND);
