import { BKind, CState, Purpose } from './constants';

/** Struct-of-arrays storage for buildings, with a free list so ids are reused. */
export class Buildings {
  cap = 0;
  count = 0;
  tile = new Int32Array(0);
  kind = new Uint8Array(0);
  level = new Uint8Array(0);
  variant = new Uint8Array(0);
  progress = new Float32Array(0);
  capacity = new Int16Array(0);
  occ = new Int16Array(0);
  access = new Int32Array(0);
  alive = new Uint8Array(0);
  visits = new Int32Array(0);
  private free: number[] = [];

  constructor(initial = 256) {
    this.grow(initial);
  }

  /** Make room for at least n entries (used when loading a save). */
  ensure(n: number): void {
    if (this.cap < n) this.grow(Math.max(n, this.cap * 2));
  }

  private grow(n: number): void {
    const copy = <T extends Int32Array | Uint8Array | Int16Array | Float32Array>(
      a: T,
      C: new (n: number) => T,
    ): T => {
      const b = new C(n);
      b.set(a);
      return b;
    };
    this.tile = copy(this.tile, Int32Array);
    this.kind = copy(this.kind, Uint8Array);
    this.level = copy(this.level, Uint8Array);
    this.variant = copy(this.variant, Uint8Array);
    this.progress = copy(this.progress, Float32Array);
    this.capacity = copy(this.capacity, Int16Array);
    this.occ = copy(this.occ, Int16Array);
    this.access = copy(this.access, Int32Array);
    this.alive = copy(this.alive, Uint8Array);
    this.visits = copy(this.visits, Int32Array);
    this.cap = n;
  }

  add(tile: number, kind: BKind, variant: number): number {
    let id = this.free.pop();
    if (id === undefined) {
      if (this.count >= this.cap) this.grow(this.cap * 2);
      id = this.count++;
    }
    this.tile[id] = tile;
    this.kind[id] = kind;
    this.level[id] = 1;
    this.variant[id] = variant;
    this.progress[id] = 0;
    this.capacity[id] = 0;
    this.occ[id] = 0;
    this.access[id] = -1;
    this.alive[id] = 1;
    this.visits[id] = 0;
    return id;
  }

  remove(id: number): void {
    this.alive[id] = 0;
    this.free.push(id);
  }

  isActive(id: number): boolean {
    return this.alive[id] === 1 && this.progress[id] >= 1;
  }

  /** Rebuild the free list after loading a save. */
  reindexFree(): void {
    this.free = [];
    for (let i = this.count - 1; i >= 0; i--) if (!this.alive[i]) this.free.push(i);
  }
}

/** Struct-of-arrays storage for citizens (Part 15.1, ECS with typed arrays). */
export class Citizens {
  cap = 0;
  count = 0;
  alive = new Uint8Array(0);
  home = new Int32Array(0);
  work = new Int32Array(0);
  state = new Uint8Array(0);
  purpose = new Uint8Array(0);
  dest = new Int32Array(0);
  nextAct = new Int32Array(0);
  offset = new Int16Array(0);
  pathPos = new Float32Array(0);
  x = new Float32Array(0);
  y = new Float32Array(0);
  lane = new Float32Array(0);
  happy = new Uint8Array(0);
  jobless = new Int32Array(0);
  /** 1 if this person looks for a job; the rest are children, students and retirees. */
  worker = new Uint8Array(0);
  paths: (Int32Array | null)[] = [];
  private free: number[] = [];

  constructor(initial = 1024) {
    this.grow(initial);
  }

  ensure(n: number): void {
    if (this.cap < n) this.grow(Math.max(n, this.cap * 2));
  }

  private grow(n: number): void {
    const copy = <T extends Int32Array | Uint8Array | Int16Array | Float32Array>(
      a: T,
      C: new (n: number) => T,
    ): T => {
      const b = new C(n);
      b.set(a);
      return b;
    };
    this.alive = copy(this.alive, Uint8Array);
    this.home = copy(this.home, Int32Array);
    this.work = copy(this.work, Int32Array);
    this.state = copy(this.state, Uint8Array);
    this.purpose = copy(this.purpose, Uint8Array);
    this.dest = copy(this.dest, Int32Array);
    this.nextAct = copy(this.nextAct, Int32Array);
    this.offset = copy(this.offset, Int16Array);
    this.pathPos = copy(this.pathPos, Float32Array);
    this.x = copy(this.x, Float32Array);
    this.y = copy(this.y, Float32Array);
    this.lane = copy(this.lane, Float32Array);
    this.happy = copy(this.happy, Uint8Array);
    this.jobless = copy(this.jobless, Int32Array);
    this.worker = copy(this.worker, Uint8Array);
    this.paths.length = n;
    this.cap = n;
  }

  add(home: number, offset: number, lane: number, tick: number, worker: boolean): number {
    let id = this.free.pop();
    if (id === undefined) {
      if (this.count >= this.cap) this.grow(this.cap * 2);
      id = this.count++;
    }
    this.alive[id] = 1;
    this.home[id] = home;
    this.work[id] = -1;
    this.state[id] = CState.Home;
    this.purpose[id] = Purpose.ToHome;
    this.dest[id] = home;
    this.nextAct[id] = 0;
    this.offset[id] = offset;
    this.pathPos[id] = 0;
    this.lane[id] = lane;
    this.happy[id] = 50;
    this.jobless[id] = tick;
    this.worker[id] = worker ? 1 : 0;
    this.paths[id] = null;
    return id;
  }

  remove(id: number): void {
    this.alive[id] = 0;
    this.paths[id] = null;
    this.free.push(id);
  }

  reindexFree(): void {
    this.free = [];
    for (let i = this.count - 1; i >= 0; i--) if (!this.alive[i]) this.free.push(i);
  }
}
