/**
 * Road graph queries on the tile grid: connected components and BFS paths with a
 * cache that is cleared whenever the road network changes.
 */
export class RoadGraph {
  readonly comp: Int32Array;
  private cache = new Map<number, Int32Array | null>();
  private readonly queue: Int32Array;
  private readonly prev: Int32Array;
  private readonly seen: Uint32Array;
  private stamp = 0;

  constructor(
    private readonly size: number,
    private readonly isRoad: (i: number) => boolean,
  ) {
    const n = size * size;
    this.comp = new Int32Array(n).fill(-1);
    this.queue = new Int32Array(n);
    this.prev = new Int32Array(n);
    this.seen = new Uint32Array(n);
  }

  rebuild(): void {
    this.cache.clear();
    const n = this.size * this.size;
    this.comp.fill(-1);
    let label = 0;
    for (let s = 0; s < n; s++) {
      if (this.comp[s] !== -1 || !this.isRoad(s)) continue;
      let head = 0;
      let tail = 0;
      this.queue[tail++] = s;
      this.comp[s] = label;
      while (head < tail) {
        const c = this.queue[head++];
        this.forNeighbours(c, (nb) => {
          if (this.comp[nb] === -1 && this.isRoad(nb)) {
            this.comp[nb] = label;
            this.queue[tail++] = nb;
          }
        });
      }
      label++;
    }
  }

  connected(a: number, b: number): boolean {
    return a >= 0 && b >= 0 && this.comp[a] !== -1 && this.comp[a] === this.comp[b];
  }

  /** Shortest road path from a to b inclusive, or null if unreachable. */
  path(a: number, b: number): Int32Array | null {
    if (!this.connected(a, b)) return null;
    const key = a * this.size * this.size + b;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const result = this.bfs(a, b);
    if (this.cache.size > 20000) this.cache.clear();
    this.cache.set(key, result);
    return result;
  }

  private bfs(a: number, b: number): Int32Array | null {
    this.stamp++;
    let head = 0;
    let tail = 0;
    this.queue[tail++] = a;
    this.seen[a] = this.stamp;
    this.prev[a] = -1;
    while (head < tail) {
      const c = this.queue[head++];
      if (c === b) break;
      this.forNeighbours(c, (nb) => {
        if (this.seen[nb] !== this.stamp && this.isRoad(nb)) {
          this.seen[nb] = this.stamp;
          this.prev[nb] = c;
          this.queue[tail++] = nb;
        }
      });
    }
    if (this.seen[b] !== this.stamp) return null;
    const out: number[] = [];
    for (let c = b; c !== -1; c = this.prev[c]) out.push(c);
    out.reverse();
    return Int32Array.from(out);
  }

  private forNeighbours(i: number, fn: (n: number) => void): void {
    const s = this.size;
    const x = i % s;
    const y = (i - x) / s;
    if (x > 0) fn(i - 1);
    if (x < s - 1) fn(i + 1);
    if (y > 0) fn(i - s);
    if (y < s - 1) fn(i + s);
  }
}
