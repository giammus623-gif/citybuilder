import type { Command } from './world';

interface Layout {
  size: number;
  business: { tile: number };
}

/**
 * A reference layout used by tests and the headless balance tool: a small grid of
 * streets next to the start lot with residential, commercial and industrial blocks.
 */
export function referenceCommands(w: Layout): Command[] {
  const s = w.size;
  const start = w.business.tile;
  const sx = start % s;
  const hy = (start - sx) / s + 1; // highway row
  const clampX = (x: number) => Math.max(1, Math.min(s - 2, x));
  const tiles = (x0: number, y0: number, x1: number, y1: number) => {
    const out: number[] = [];
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) out.push(y * s + clampX(x));
    return out;
  };
  const avenue = clampX(sx + 2);
  const cmds: Command[] = [
    { t: 'paint', tool: 'road', tiles: tiles(sx + 1, hy, avenue, hy) },
    { t: 'paint', tool: 'road', tiles: tiles(avenue, hy - 12, avenue, hy + 12) },
  ];
  for (const dy of [-12, -6, 6, 12]) {
    cmds.push({
      t: 'paint',
      tool: 'road',
      tiles: tiles(avenue - 10, hy + dy, avenue + 6, hy + dy),
    });
  }
  cmds.push({ t: 'paint', tool: 'res', tiles: tiles(avenue - 10, hy - 11, avenue - 1, hy - 7) });
  cmds.push({ t: 'paint', tool: 'res', tiles: tiles(avenue - 10, hy + 7, avenue - 1, hy + 11) });
  cmds.push({ t: 'paint', tool: 'com', tiles: tiles(avenue - 10, hy - 5, avenue - 1, hy - 2) });
  cmds.push({ t: 'paint', tool: 'ind', tiles: tiles(avenue + 1, hy + 7, avenue + 6, hy + 11) });
  cmds.push({ t: 'paint', tool: 'park', tiles: tiles(avenue + 1, hy - 5, avenue + 3, hy - 3) });
  return cmds;
}
