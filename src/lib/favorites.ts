export interface FavoriteEntry {
  animeId: number;
  title: string;
  coverImage: string;
  addedAt: number;
}

const STORAGE_KEY = "kogemi_favorites";

function getFavorites(): FavoriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteEntry[];
  } catch {
    return [];
  }
}

function saveFavorites(list: FavoriteEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isFavorite(animeId: number): boolean {
  return getFavorites().some((f) => f.animeId === animeId);
}

export function toggleFavorite(entry: Omit<FavoriteEntry, "addedAt">): boolean {
  const list = getFavorites();
  const idx = list.findIndex((f) => f.animeId === entry.animeId);
  if (idx >= 0) {
    list.splice(idx, 1);
    saveFavorites(list);
    return false; // removed
  }
  list.unshift({ ...entry, addedAt: Date.now() });
  saveFavorites(list);
  return true; // added
}

export function getAllFavorites(): FavoriteEntry[] {
  return getFavorites().sort((a, b) => b.addedAt - a.addedAt);
}
