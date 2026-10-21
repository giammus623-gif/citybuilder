import type { SaveData } from '../sim/world';

const DB = 'city-lab';
const STORE = 'saves';
const SLOT = 'auto';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Saves live only on this device (Part 17). Every call tolerates blocked storage. */
export async function saveGame(data: SaveData): Promise<boolean> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ savedAt: Date.now(), data }, SLOT);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function loadGame(): Promise<{ savedAt: number; data: SaveData } | null> {
  try {
    const db = await open();
    const out = await new Promise<{ savedAt: number; data: SaveData } | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(SLOT);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return out;
  } catch {
    return null;
  }
}

/** JSON export with typed arrays tagged, so a save can travel as a file. */
export function exportSave(data: SaveData): string {
  return JSON.stringify(data, (_k, v: unknown) => {
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
      return { __t: v.constructor.name, d: Array.from(v as unknown as ArrayLike<number>) };
    }
    return v;
  });
}

export function importSave(text: string): SaveData {
  return JSON.parse(text, (_k, v: unknown) => {
    if (v && typeof v === 'object' && '__t' in v && 'd' in v) {
      const tag = (v as { __t: string }).__t;
      const d = (v as { d: number[] }).d;
      switch (tag) {
        case 'Uint8Array':
          return Uint8Array.from(d);
        case 'Int16Array':
          return Int16Array.from(d);
        case 'Int32Array':
          return Int32Array.from(d);
        case 'Float32Array':
          return Float32Array.from(d);
      }
    }
    return v;
  }) as SaveData;
}
