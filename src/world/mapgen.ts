import { hash2 } from '../sim/rng';
import { MAP_SIZE, Terrain } from '../sim/constants';

export interface GeneratedMap {
  size: number;
  terrain: Uint8Array;
  /** Tiles of the highway that links the city to the rest of the world. */
  highway: number[];
  /** Where newcomers enter the map (first highway tile, on the edge). */
  entrance: number;
  /** The single ready lot for the player's business (Part 4.2). */
  startLot: number;
  cityName: string;
}

function smoothNoise(x: number, y: number, seed: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, seed: number): number {
  return (
    smoothNoise(x, y, seed, 12) * 0.6 +
    smoothNoise(x, y, seed + 17, 6) * 0.3 +
    smoothNoise(x, y, seed + 31, 3) * 0.1
  );
}

const PREFIX = ['Borgo', 'Villa', 'Porto', 'Ponte', 'Riva', 'Colle', 'Piana', 'Corte'];
const SUFFIX = ['Canale', 'dei Mulini', 'Salvia', 'Gesso', 'Nuovo', 'Chiaro', 'dei Tigli', 'Lungo'];

export function cityNameFor(seed: number): string {
  return `${PREFIX[seed % PREFIX.length]} ${SUFFIX[(seed >>> 3) % SUFFIX.length]}`;
}

export function generateMap(seed: number, size = MAP_SIZE): GeneratedMap {
  const terrain = new Uint8Array(size * size);
  const idx = (x: number, y: number) => y * size + x;

  // A meandering canal crossing the map north to south, two tiles wide.
  const base = Math.floor(size * (0.55 + hash2(1, 2, seed) * 0.2));
  const canalX: number[] = [];
  for (let y = 0; y < size; y++) {
    const cx = Math.round(base + Math.sin(y / 7 + seed) * 3 + (smoothNoise(0, y, seed + 5, 9) - 0.5) * 4);
    canalX.push(cx);
    for (let dx = 0; dx < 2; dx++) {
      const x = cx + dx;
      if (x >= 0 && x < size) terrain[idx(x, y)] = Terrain.Water;
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = idx(x, y);
      if (terrain[i] === Terrain.Water) continue;
      const n = fbm(x, y, seed);
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (n > 0.66) terrain[i] = Terrain.Forest;
      else if (edge < 7 && n < 0.45) terrain[i] = Terrain.Fertile;
    }
  }

  // Highway from the west edge to the start lot, left of the canal.
  const hy = Math.floor(size / 2) + Math.floor((hash2(3, 4, seed) - 0.5) * 8);
  const endX = Math.max(14, canalX[hy] - 10);
  const highway: number[] = [];
  for (let x = 0; x <= endX; x++) {
    const i = idx(x, hy);
    highway.push(i);
    if (terrain[i] !== Terrain.Water) terrain[i] = Terrain.Grass;
  }
  const startLot = idx(endX, hy - 1);
  terrain[startLot] = Terrain.Grass;
  // Keep a clear meadow around the start so the first blocks are easy to draw.
  for (let y = hy - 6; y <= hy + 6; y++) {
    for (let x = endX - 8; x <= endX + 6; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = idx(x, y);
      if (terrain[i] === Terrain.Forest) terrain[i] = Terrain.Grass;
    }
  }

  return { size, terrain, highway, entrance: highway[0], startLot, cityName: cityNameFor(seed) };
}
