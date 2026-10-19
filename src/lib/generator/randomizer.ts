/**
 * Small, dependency-free deterministic RNG.
 * The engine must be reproducible: the same seed always produces the same
 * project, which is what makes sharing and tests reliable.
 */

export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hash32(...parts: (string | number)[]): string {
  const h1 = hashString(parts.join("|"));
  const h2 = hashString(`salt:${parts.join("~")}`);
  return (h1.toString(36) + h2.toString(36)).padStart(12, "0");
}

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(probability: number): boolean;
  id(prefix?: string): string;
}

export function createRng(seed: string): Rng {
  let a = hashString(seed) || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max) => Math.floor(next() * Math.max(1, max)),
    pick: (items) => items[Math.floor(next() * items.length)] ?? items[0],
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    chance: (p) => next() < p,
    id: (prefix = "id") => `${prefix}_${Math.floor(next() * 1e9).toString(36)}`,
  };
}

export function weightedPick<T extends { weight?: number }>(rng: Rng, items: readonly T[]): T | null {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + Math.max(0.0001, item.weight ?? 1), 0);
  let target = rng.next() * total;
  for (const item of items) {
    target -= Math.max(0.0001, item.weight ?? 1);
    if (target <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Weighted sampling without replacement. Used everywhere the engine needs
 * several distinct items from a pool while still respecting weights.
 */
export function weightedSample<T extends { weight?: number }>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length && picked.length < count) {
    const chosen = weightedPick(rng, pool);
    if (!chosen) break;
    picked.push(chosen);
    pool.splice(pool.indexOf(chosen), 1);
  }
  return picked;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSeed(): string {
  if (typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto) {
    const buf = new Uint32Array(2);
    globalThis.crypto.getRandomValues(buf);
    return `${buf[0].toString(36)}${buf[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
