const STORAGE_KEY = "kogemi_search_history";
const MAX_ENTRIES = 15;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSearchQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = getSearchHistory().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  history.unshift(trimmed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)));
}

export function removeSearchQuery(query: string) {
  const history = getSearchHistory().filter((q) => q !== query);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
