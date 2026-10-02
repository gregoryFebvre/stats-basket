/** Sous-ensemble de l'API Storage dont on a besoin : permet de tester sans navigateur. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export class MemoryStore implements KeyValueStore {
  protected map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  keys() { return [...this.map.keys()]; }
}

/** Adaptateur sur window.localStorage. */
export function navigateurStore(): KeyValueStore {
  const ls = globalThis.localStorage;
  return {
    getItem: (k) => ls.getItem(k),
    setItem: (k, v) => ls.setItem(k, v),
    removeItem: (k) => ls.removeItem(k),
    keys: () => Array.from({ length: ls.length }, (_, i) => ls.key(i)!).filter(Boolean),
  };
}
