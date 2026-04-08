export interface WatchEntry {
  animeId: number;
  title: string;
  coverImage: string;
  season: number;
  episode: number;
  totalEpisodes: number;
  updatedAt: number;
  /** Playback timestamp in seconds (for resume) */
  timestamp?: number;
  /** Total duration in seconds */
  duration?: number;
}

const STORAGE_KEY = "kogemi_watch_history";
const VIDSRC_PROGRESS_KEY = "watch_progress";

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
    // Preserve existing timestamp/duration if not provided
    if (updated.timestamp === undefined && history[idx].timestamp !== undefined) {
      updated.timestamp = history[idx].timestamp;
    }
    if (updated.duration === undefined && history[idx].duration !== undefined) {
      updated.duration = history[idx].duration;
    }
    history[idx] = updated;
  } else {
    history.unshift(updated);
  }

  // Keep max 50 entries
  const trimmed = history.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function updateWatchTimestamp(animeId: number, timestamp: number, duration?: number) {
  const history = getWatchHistory();
  const idx = history.findIndex((h) => h.animeId === animeId);
  if (idx >= 0) {
    history[idx].timestamp = timestamp;
    if (duration !== undefined) history[idx].duration = duration;
    history[idx].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
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

export function removeFromHistory(animeId: number) {
  const history = getWatchHistory().filter((h) => h.animeId !== animeId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearWatchHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Initialize vidsrc.ru watch progress listener */
export function initVidsrcProgressSync(onProgress?: (data: { id: string; progress?: { watched: number; duration: number } }) => void) {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'MEDIA_DATA') {
      const mediaData = event.data.data;
      if (mediaData.id && (mediaData.type === 'movie' || mediaData.type === 'tv')) {
        // Save to vidsrc progress store
        const existing = JSON.parse(localStorage.getItem(VIDSRC_PROGRESS_KEY) || '{}');
        existing[mediaData.id] = {
          ...existing[mediaData.id],
          ...mediaData,
          last_updated: Date.now(),
        };
        localStorage.setItem(VIDSRC_PROGRESS_KEY, JSON.stringify(existing));

        if (onProgress && mediaData.progress) {
          onProgress({
            id: mediaData.id,
            progress: mediaData.progress,
          });
        }
      }
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
