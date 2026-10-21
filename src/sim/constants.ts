/** Map side in tiles. One tile is roughly 20 m on the plastico (scale 1:500 label). */
export const MAP_SIZE = 64;

/** Fixed timestep: 10 ticks per real second at ×1. */
export const TICKS_PER_SECOND = 10;
/** One game day = 24 real minutes at ×1 (Part 3.1). One tick = 6 game seconds. */
export const TICKS_PER_DAY = 14400;
export const TICKS_PER_HOUR = TICKS_PER_DAY / 24;

export const enum Terrain {
  Grass = 0,
  Water = 1,
  Forest = 2,
  Fertile = 3,
}

export const enum TileUse {
  Empty = 0,
  Road = 1,
  Park = 2,
  Building = 3,
}

export const enum Zone {
  None = 0,
  Res = 1,
  Com = 2,
  Ind = 3,
}

export const enum BKind {
  Res = 0,
  Com = 1,
  Ind = 2,
  Player = 3,
}

export const enum CState {
  Home = 0,
  Moving = 1,
  Work = 2,
  Shop = 3,
}

/** What a moving citizen is heading to, so arrival knows the next state. */
export const enum Purpose {
  ToHome = 0,
  ToWork = 1,
  ToShop = 2,
}

export const COSTS = {
  road: 25,
  bridge: 100,
  zone: 5,
  park: 150,
  bulldoze: 10,
} as const;

export const UPKEEP_PER_DAY = {
  road: 2,
  park: 10,
} as const;

export const TAX_PER_DAY = {
  resident: 25,
  worker: 15,
} as const;

/** Capacity per level (residents for homes, jobs for the rest). Index 0 unused. */
export const CAPACITY: Record<number, readonly number[]> = {
  [0]: [0, 6, 16, 40],
  [1]: [0, 5, 12, 30],
  [2]: [0, 10, 20, 35],
};

export const WALK_SPEED = 0.35; // tiles per tick
export const CONSTRUCTION_TICKS = 900; // 1.5 game hours
