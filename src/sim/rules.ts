import { COSTS, Terrain, TileUse, Zone } from './constants';

export type Tool = 'road' | 'res' | 'com' | 'ind' | 'park' | 'bulldoze';

export interface TileFacts {
  use: number;
  zone: number;
  terrain: number;
  highway: boolean;
  playerLot: boolean;
}

/**
 * What a tool costs on one tile, or -1 when it cannot act there. Shared by the
 * simulation and the build preview so the ghost never lies about the price.
 */
export function tileCost(tool: Tool, f: TileFacts): number {
  const water = f.terrain === Terrain.Water;
  switch (tool) {
    case 'road':
      if (f.use !== TileUse.Empty) return -1;
      return water ? COSTS.bridge : COSTS.road;
    case 'res':
    case 'com':
    case 'ind': {
      const z = tool === 'res' ? Zone.Res : tool === 'com' ? Zone.Com : Zone.Ind;
      if (f.use !== TileUse.Empty || water || f.zone === z) return -1;
      return COSTS.zone;
    }
    case 'park':
      if (f.use !== TileUse.Empty || water) return -1;
      return COSTS.park;
    case 'bulldoze':
      if (f.highway || f.playerLot) return -1;
      if (f.use === TileUse.Empty && f.zone === Zone.None) return -1;
      return COSTS.bulldoze;
  }
}
