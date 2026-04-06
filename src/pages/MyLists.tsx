import { useState, useEffect } from "react";
import { getWatchHistory, removeFromHistory, type WatchEntry } from "@/lib/watch-history";
import { getAllFavorites, type FavoriteEntry } from "@/lib/favorites";
import { getWatchlist, getWatchlistByStatus, removeFromWatchlist, type WatchlistEntry, type WatchlistStatus, WATCHLIST_LABELS } from "@/lib/watchlist";
import type { AnimeResult } from "@/lib/anime-api";
import { Bookmark, Heart, History, Trash2, Play, CheckCircle, PauseCircle, XCircle } from "lucide-react";

interface Props {
  onSelect: (anime: AnimeResult) => void;
}

type Tab = "watchlist" | "favorites" | "history";

const STATUS_ICONS: Record<WatchlistStatus, typeof Play> = {
  watching: Play,
  completed: CheckCircle,
  plan_to_watch: PauseCircle,
  dropped: XCircle,
};

const MyLists = ({ onSelect }: Props) => {
  const [tab, setTab] = useState<Tab>("watchlist");
  const [history, setHistory] = useState<WatchEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<WatchlistStatus | "all">("all");

  useEffect(() => {
    setHistory(getWatchHistory());
    setFavorites(getAllFavorites());
    setWatchlist(getWatchlist());
  }, []);

  const toAnimeResult = (entry: { animeId: number; title: string; coverImage: string; totalEpisodes?: number }): AnimeResult => ({
    id: entry.animeId,
    title: { romaji: entry.title, english: entry.title },
    coverImage: { large: entry.coverImage },
    episodes: entry.totalEpisodes || undefined,
  });

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filteredWatchlist = statusFilter === "all" ? watchlist : getWatchlistByStatus(statusFilter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <h1 className="text-lg font-display font-bold text-foreground">My Lists</h1>
          <div className="flex gap-1 ml-auto">
            {([
              { id: "watchlist" as Tab, icon: Bookmark, label: "Watchlist" },
              { id: "favorites" as Tab, icon: Heart, label: "Favorites" },
              { id: "history" as Tab, icon: History, label: "History" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        {/* Watchlist with status filters */}
        {tab === "watchlist" && (
          <div>
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                All
              </button>
              {(Object.keys(WATCHLIST_LABELS) as WatchlistStatus[]).map((status) => {
                const Icon = STATUS_ICONS[status];
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      statusFilter === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {WATCHLIST_LABELS[status]}
                  </button>
                );
              })}
            </div>

            {filteredWatchlist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                No anime in {statusFilter === "all" ? "your watchlist" : WATCHLIST_LABELS[statusFilter as WatchlistStatus].toLowerCase()} yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredWatchlist.map((entry) => (
                  <button
                    key={entry.animeId}
                    onClick={() => onSelect(toAnimeResult(entry))}
                    className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.97]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[9px] font-medium px-1.5 py-0.5 rounded">
                        {WATCHLIST_LABELS[entry.status]}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(entry.animeId); setWatchlist(getWatchlist()); }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all z-10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-display font-semibold text-foreground line-clamp-2">{entry.title}</h3>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites */}
        {tab === "favorites" && (
          favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No favorites yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {favorites.map((entry) => (
                <button
                  key={entry.animeId}
                  onClick={() => onSelect(toAnimeResult(entry))}
                  className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.97]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" loading="lazy" />
                    <Heart className="absolute top-1 right-1 w-4 h-4 fill-primary text-primary" />
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs font-display font-semibold text-foreground line-clamp-2">{entry.title}</h3>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* History */}
        {tab === "history" && (
          history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">No watch history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.sort((a, b) => b.updatedAt - a.updatedAt).map((entry) => (
                <button
                  key={entry.animeId}
                  onClick={() => onSelect(toAnimeResult(entry))}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-all text-left active:scale-[0.99]"
                >
                  <img src={entry.coverImage} alt={entry.title} className="w-12 h-16 object-cover rounded-md shrink-0" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-semibold text-foreground line-clamp-1">{entry.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">S{entry.season} · E{entry.episode} / {entry.totalEpisodes}</p>
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((entry.episode / entry.totalEpisodes) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{formatTime(entry.updatedAt)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.animeId); setHistory(getWatchHistory()); }}
                      className="p-1 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default MyLists;
