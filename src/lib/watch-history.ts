export interface WatchEntry {
  animeId: number;
  title: string;
  coverImage: string;
  season: number;
  episode: number;
  totalEpisodes: number;
  updatedAt: number;
}

const STORAGE_KEY = "kogemi_watch_history";

export function getWatchHistory(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchEntry[];
  } catch {
    return [];
  }
}

export function saveWatchProgress(entry: WatchEntry) {
  const history = getWatchHistory();
  const idx = history.findIndex((h) => h.animeId === entry.animeId);
  const updated = { ...entry, updatedAt: Date.now() };

  if (idx >= 0) {
    history[idx] = updated;
  } else {
    history.unshift(updated);
  }

  // Keep max 50 entries
  const trimmed = history.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getWatchProgress(animeId: number): WatchEntry | null {
  const history = getWatchHistory();
  return history.find((h) => h.animeId === animeId) || null;
}

export function getRecentlyWatched(limit = 6): WatchEntry[] {
  return getWatchHistory()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}
