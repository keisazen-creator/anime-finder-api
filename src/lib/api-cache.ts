interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

const memCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes (up from 5)
const HOT_TTL = 30 * 60 * 1000; // 30 minutes for frequently accessed
const STORAGE_PREFIX = "kogemi_cache_";
const MAX_MEM_SIZE = 500; // up from 200
const MAX_STORAGE_ITEMS = 100; // up from 50
const HOT_THRESHOLD = 3; // hits before promoting to hot

// Deduplicate in-flight requests
const inflight = new Map<string, Promise<unknown>>();

function tryGetStorage<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const ttl = (entry.hits || 0) >= HOT_THRESHOLD ? HOT_TTL : DEFAULT_TTL;
    if (Date.now() - entry.timestamp > ttl) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function trySetStorage<T>(key: string, data: T, hits: number): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    if (keys.length > MAX_STORAGE_ITEMS) {
      keys.slice(0, keys.length - MAX_STORAGE_ITEMS + 1).forEach((k) => sessionStorage.removeItem(k));
    }
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now(), hits }));
  } catch {
    // Storage full — ignore
  }
}

export function getCached<T>(key: string): T | null {
  // Check memory first
  const mem = memCache.get(key);
  if (mem) {
    const ttl = mem.hits >= HOT_THRESHOLD ? HOT_TTL : DEFAULT_TTL;
    if (Date.now() - mem.timestamp <= ttl) {
      mem.hits++;
      return mem.data as T;
    }
    memCache.delete(key);
  }

  // Fall back to sessionStorage
  const stored = tryGetStorage<T>(key);
  if (stored) {
    stored.hits = (stored.hits || 0) + 1;
    memCache.set(key, stored as CacheEntry<unknown>);
    return stored.data;
  }
  return null;
}

export function setCache<T>(key: string, data: T): void {
  if (memCache.size > MAX_MEM_SIZE) {
    // Evict least-hit entries
    const entries = [...memCache.entries()].sort((a, b) => a[1].hits - b[1].hits);
    const toRemove = Math.floor(MAX_MEM_SIZE * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      memCache.delete(entries[i][0]);
    }
  }
  memCache.set(key, { data, timestamp: Date.now(), hits: 1 });
  trySetStorage(key, data, 1);
}

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  // Deduplicate concurrent requests for the same key
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher().then((data) => {
    setCache(key, data);
    inflight.delete(key);
    return data;
  }).catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

/** Prefetch data into cache without blocking */
export function prefetch<T>(key: string, fetcher: () => Promise<T>): void {
  if (getCached<T>(key)) return;
  if (inflight.has(key)) return;
  cachedFetch(key, fetcher).catch(() => {});
}
