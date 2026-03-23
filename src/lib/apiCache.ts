// Simple in-memory TTL cache (works in Node API routes and browser)

interface CacheEntry<T> { data: T; expiresAt: number }

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs = 5 * 60_000): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  get<T>(key: string): T | null {
    const e = this.store.get(key) as CacheEntry<T> | undefined;
    if (!e || Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    return e.data;
  }

  clear(): void { this.store.clear(); }
}

export const cache = new TTLCache();

// ─── Cached wrappers ──────────────────────────────────────────────────────────

import type { ParsedHeroEntry, ParsedHeroRank, ParsedHeroPosition } from './mlbbApi';
import { fetchHeroList, fetchHeroRank, fetchHeroPositions } from './mlbbApi';

export async function getCachedHeroList(): Promise<ParsedHeroEntry[]> {
  const key    = 'hero-list-v2';
  const cached = cache.get<ParsedHeroEntry[]>(key);
  if (cached) return cached;
  const data = await fetchHeroList();
  cache.set(key, data, 10 * 60_000);
  return data;
}

export async function getCachedHeroRank(): Promise<ParsedHeroRank[]> {
  const key    = 'hero-rank-v2';
  const cached = cache.get<ParsedHeroRank[]>(key);
  if (cached) return cached;
  const data = await fetchHeroRank();
  cache.set(key, data, 10 * 60_000);
  return data;
}

export async function getCachedHeroPositions(): Promise<ParsedHeroPosition[]> {
  const key    = 'hero-positions-v1';
  const cached = cache.get<ParsedHeroPosition[]>(key);
  if (cached) return cached;
  const data = await fetchHeroPositions();
  cache.set(key, data, 30 * 60_000); // 30min — positions don't change often
  return data;
}
