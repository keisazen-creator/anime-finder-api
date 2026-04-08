export interface WatchTimelineEntry {
  season: number;
  episode: number;
  absoluteEpisode?: number;
  updatedAt: number;
  /** Playback timestamp in seconds (for resume) */
  timestamp?: number;
  /** Total duration in seconds */
  duration?: number;
}

export interface WatchEntry {
  animeId: number;
  title: string;
  coverImage: string;
  season: number;
  /** Relative episode number shown in the UI */
  episode: number;
  /** Absolute episode number used for internal season/range mapping */
  absoluteEpisode?: number;
  totalEpisodes: number;
  updatedAt: number;
  format?: string;
  /** Playback timestamp in seconds (for resume) */
  timestamp?: number;
  /** Total duration in seconds */
  duration?: number;
  timeline?: WatchTimelineEntry[];
}

const STORAGE_KEY = "kogemi_watch_history";
const VIDSRC_PROGRESS_KEY = "watch_progress";

function inferSeasonFromTitle(title: string): number | null {
  const cleanTitle = title.toLowerCase();
  const seasonPatterns = [
    /season\s*(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s*season/i,
    /\bs(\d+)\b/i,
  ];

  for (const pattern of seasonPatterns) {
    const match = cleanTitle.match(pattern);
    if (match) return parseInt(match[1], 10);
  }

  if (/\bfinal season\b/i.test(cleanTitle)) return 4;
  if (/\b(?:4th|iv)\b/.test(cleanTitle)) return 4;
  if (/\b(?:3rd|iii)\b/.test(cleanTitle)) return 3;
  if (/\b(?:2nd|ii)\b/.test(cleanTitle)) return 2;

  return null;
}

function getTimelineKey(entry: Pick<WatchTimelineEntry, "season" | "episode" | "absoluteEpisode">): string {
  return `${entry.season}:${entry.absoluteEpisode ?? entry.episode}`;
}

function normalizeTimelineEntry(
  entry: Partial<WatchTimelineEntry> | undefined,
  fallback: WatchTimelineEntry
): WatchTimelineEntry {
  if (!entry) return fallback;

  return {
    season: entry.season ?? fallback.season,
    episode: entry.episode ?? fallback.episode,
    absoluteEpisode: entry.absoluteEpisode ?? entry.episode ?? fallback.absoluteEpisode,
    updatedAt: entry.updatedAt ?? fallback.updatedAt,
    timestamp: entry.timestamp ?? fallback.timestamp,
    duration: entry.duration ?? fallback.duration,
  };
}

function upsertTimelineEntry(
  timeline: WatchTimelineEntry[] | undefined,
  nextEntry: WatchTimelineEntry
): WatchTimelineEntry[] {
  const nextKey = getTimelineKey(nextEntry);

  return (timeline ?? [])
    .filter((entry) => getTimelineKey(entry) !== nextKey)
    .concat(nextEntry)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);
}

function normalizeWatchEntry(entry: WatchEntry): WatchEntry {
  const inferredSeason = inferSeasonFromTitle(entry.title);
  const season = entry.season > 1 ? entry.season : inferredSeason ?? entry.season ?? 1;
  const episode = entry.episode || 1;
  const absoluteEpisode = entry.absoluteEpisode ?? episode;
  const updatedAt = entry.updatedAt || Date.now();
  const totalEpisodes = Math.max(entry.totalEpisodes || 1, 1);

  const fallbackTimelineEntry: WatchTimelineEntry = {
    season,
    episode,
    absoluteEpisode,
    updatedAt,
    timestamp: entry.timestamp,
    duration: entry.duration,
  };

  const timeline = Array.isArray(entry.timeline) && entry.timeline.length > 0
    ? entry.timeline
        .map((item) => normalizeTimelineEntry(item, fallbackTimelineEntry))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 12)
    : [fallbackTimelineEntry];

  return {
    ...entry,
    season,
    episode,
    absoluteEpisode,
    updatedAt,
    totalEpisodes,
    timeline,
  };
}

export function getWatchHistory(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchEntry[];
    return parsed.map(normalizeWatchEntry);
  } catch {
    return [];
  }
}

export function saveWatchProgress(entry: WatchEntry) {
  const history = getWatchHistory();
  const idx = history.findIndex((h) => h.animeId === entry.animeId);
  const updated = normalizeWatchEntry({ ...entry, updatedAt: Date.now() });

  if (idx >= 0) {
    const current = normalizeWatchEntry(history[idx]);
    const sameEpisode = (current.absoluteEpisode ?? current.episode) === (updated.absoluteEpisode ?? updated.episode)
      && current.season === updated.season;

    if (sameEpisode && updated.timestamp === undefined && current.timestamp !== undefined) {
      updated.timestamp = current.timestamp;
    }
    if (sameEpisode && updated.duration === undefined && current.duration !== undefined) {
      updated.duration = current.duration;
    }

    updated.timeline = upsertTimelineEntry(current.timeline, {
      season: updated.season,
      episode: updated.episode,
      absoluteEpisode: updated.absoluteEpisode ?? updated.episode,
      updatedAt: updated.updatedAt,
      timestamp: updated.timestamp,
      duration: updated.duration,
    });

    history[idx] = updated;
  } else {
    updated.timeline = upsertTimelineEntry(updated.timeline, {
      season: updated.season,
      episode: updated.episode,
      absoluteEpisode: updated.absoluteEpisode ?? updated.episode,
      updatedAt: updated.updatedAt,
      timestamp: updated.timestamp,
      duration: updated.duration,
    });

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
    const updatedAt = Date.now();
    const current = normalizeWatchEntry(history[idx]);

    current.timestamp = timestamp;
    if (duration !== undefined) current.duration = duration;
    current.updatedAt = updatedAt;
    current.timeline = upsertTimelineEntry(current.timeline, {
      season: current.season,
      episode: current.episode,
      absoluteEpisode: current.absoluteEpisode ?? current.episode,
      updatedAt,
      timestamp,
      duration: duration ?? current.duration,
    });

    history[idx] = current;
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

export function getRecentTimeline(animeId: number, limit = 3): WatchTimelineEntry[] {
  const progress = getWatchProgress(animeId);
  return progress?.timeline?.slice(0, limit) || [];
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
