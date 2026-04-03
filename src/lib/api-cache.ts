interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STORAGE_PREFIX = "kogemi_cache_";
const MAX_MEM_SIZE = 200;
const MAX_STORAGE_ITEMS = 50;

// Deduplicate in-flight requests
const inflight = new Map<string, Promise<unknown>>();

function tryGetStorage<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > DEFAULT_TTL) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function trySetStorage<T>(key: string, data: T): void {
  try {
    // Evict oldest if too many
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    if (keys.length > MAX_STORAGE_ITEMS) {
      keys.slice(0, keys.length - MAX_STORAGE_ITEMS + 1).forEach((k) => sessionStorage.removeItem(k));
    }
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Storage full — ignore
  }
}

export function getCached<T>(key: string): T | null {
  // Check memory first
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.timestamp <= DEFAULT_TTL) return mem.data as T;
  if (mem) memCache.delete(key);

  // Fall back to sessionStorage
  const stored = tryGetStorage<T>(key);
  if (stored) {
    // Promote to memory
    memCache.set(key, { data: stored, timestamp: Date.now() });
    return stored;
  }
  return null;
}

export function setCache<T>(key: string, data: T): void {
  if (memCache.size > MAX_MEM_SIZE) {
    const oldest = memCache.keys().next().value;
    if (oldest) memCache.delete(oldest);
  }
  memCache.set(key, { data, timestamp: Date.now() });
  trySetStorage(key, data);
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
