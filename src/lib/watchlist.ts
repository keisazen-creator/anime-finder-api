export type WatchlistStatus = "watching" | "completed" | "plan_to_watch" | "dropped";

export interface WatchlistEntry {
  animeId: number;
  title: string;
  coverImage: string;
  status: WatchlistStatus;
  addedAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "kogemi_watchlist";

function getAll(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchlistEntry[];
  } catch {
    return [];
  }
}

function saveAll(list: WatchlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getWatchlist(): WatchlistEntry[] {
  return getAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getWatchlistByStatus(status: WatchlistStatus): WatchlistEntry[] {
  return getAll()
    .filter((e) => e.status === status)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getWatchlistStatus(animeId: number): WatchlistStatus | null {
  const entry = getAll().find((e) => e.animeId === animeId);
  return entry?.status ?? null;
}

export function setWatchlistStatus(
  animeId: number,
  status: WatchlistStatus,
  title: string,
  coverImage: string
): void {
  const list = getAll();
  const idx = list.findIndex((e) => e.animeId === animeId);
  const now = Date.now();
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].updatedAt = now;
  } else {
    list.unshift({ animeId, title, coverImage, status, addedAt: now, updatedAt: now });
  }
  saveAll(list.slice(0, 200));
}

export function removeFromWatchlist(animeId: number): void {
  saveAll(getAll().filter((e) => e.animeId !== animeId));
}

export const WATCHLIST_LABELS: Record<WatchlistStatus, string> = {
  watching: "Continue",
  completed: "Completed",
  plan_to_watch: "Plan to Watch",
  dropped: "Dropped",
};
