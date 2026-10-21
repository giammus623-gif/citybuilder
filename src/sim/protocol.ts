import type {
  BusinessState,
  Command,
  Demand,
  GameEvent,
  HappinessFactors,
  LedgerDay,
  SaveData,
  Tool,
} from './world';

export type ToWorker =
  | { type: 'new'; seed: number; archetype: string }
  | { type: 'load'; save: SaveData }
  | { type: 'cmd'; cmd: Command }
  | { type: 'speed'; speed: number }
  | { type: 'save'; requestId: number }
  | { type: 'preview'; tool: Tool; tiles: number[]; requestId: number }
  | { type: 'inspect'; tile: number; requestId: number }
  /** The main thread has drawn the last snapshot; the worker may send the next one. */
  | { type: 'ack' };

export interface GridView {
  size: number;
  terrain: Uint8Array;
  use: Uint8Array;
  zone: Uint8Array;
  highway: Uint8Array;
  landValue: Float32Array;
}

/** Packed building record stride in Snapshot.buildings. */
export const B_STRIDE = 8;
export const B_TILE = 0;
export const B_KIND = 1;
export const B_LEVEL = 2;
export const B_VARIANT = 3;
export const B_PROGRESS = 4;
export const B_OCC = 5;
export const B_CAP = 6;
export const B_ID = 7;

export interface Snapshot {
  tick: number;
  day: number;
  timeOfDay: number;
  speed: number;
  cityName: string;
  seed: number;
  money: number;
  pop: number;
  employed: number;
  jobs: number;
  happiness: number;
  factors: HappinessFactors;
  demand: Demand;
  business: BusinessState;
  lastDay: LedgerDay | null;
  canUndo: boolean;
  canRedo: boolean;
  tickMs: number;
  grid?: GridView;
  buildings?: Float32Array;
  /** x, y per citizen slot; NaN when the person is indoors. */
  people: Float32Array;
  events: GameEvent[];
}

export interface TileInfo {
  tile: number;
  use: number;
  zone: number;
  landValue: number;
  building: null | {
    id: number;
    kind: number;
    level: number;
    progress: number;
    occ: number;
    capacity: number;
    happiness: number | null;
    visits: number;
    player: boolean;
  };
}

export type FromWorker =
  | { type: 'snapshot'; snap: Snapshot }
  | { type: 'saved'; requestId: number; save: SaveData }
  | { type: 'preview'; requestId: number; cost: number; valid: number }
  | { type: 'inspect'; requestId: number; info: TileInfo }
  | { type: 'error'; message: string };
