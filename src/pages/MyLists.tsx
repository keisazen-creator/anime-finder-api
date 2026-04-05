import { useState, useEffect } from "react";
import { getWatchHistory, removeFromHistory, type WatchEntry } from "@/lib/watch-history";
import { getAllFavorites, type FavoriteEntry } from "@/lib/favorites";
import type { AnimeResult } from "@/lib/anime-api";
import { Bookmark, Heart, History, X, Play } from "lucide-react";

interface Props {
  onSelect: (anime: AnimeResult) => void;
}

type Tab = "watchlist" | "favorites" | "history";

const MyLists = ({ onSelect }: Props) => {
  const [tab, setTab] = useState<Tab>("history");
  const [history, setHistory] = useState<WatchEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  useEffect(() => {
    setHistory(getWatchHistory());
    setFavorites(getAllFavorites());
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

  const tabs: { id: Tab; label: string; icon: typeof History }[] = [
    { id: "history", label: "History", icon: History },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "watchlist", label: "Watchlist", icon: Bookmark },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center">
          <h1 className="text-lg font-display font-bold text-foreground">My Lists</h1>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {tab === "history" && (
          <>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No watch history yet.</p>
            ) : (
              <div className="space-y-2">
                {history.sort((a, b) => b.updatedAt - a.updatedAt).map((entry) => (
                  <button
                    key={entry.animeId}
                    onClick={() => onSelect(toAnimeResult(entry))}
                    className="group w-full flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 transition-all text-left"
                  >
                    <img src={entry.coverImage} alt={entry.title} className="w-12 h-16 object-cover rounded-md shrink-0" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{entry.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        S{entry.season} · E{entry.episode} / {entry.totalEpisodes}
                      </p>
                      <div className="w-full h-1 bg-muted rounded-full mt-1.5">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((entry.episode / entry.totalEpisodes) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{formatTime(entry.updatedAt)}</span>
                      <Play className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(entry.animeId);
                        setHistory(getWatchHistory());
                      }}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "favorites" && (
          <>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No favorites yet. Tap the heart icon on any anime.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {favorites.map((entry) => (
                  <button
                    key={entry.animeId}
                    onClick={() => onSelect(toAnimeResult(entry))}
                    className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.97]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      <div className="absolute top-1 right-1 p-1 rounded-full bg-primary/90">
                        <Heart className="w-2.5 h-2.5 text-primary-foreground fill-primary-foreground" />
                      </div>
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-display font-semibold text-foreground line-clamp-2 leading-snug">{entry.title}</h3>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "watchlist" && (
          <p className="text-sm text-muted-foreground text-center py-16">
            Your watchlist is synced with your favorites. Check the Favorites tab!
          </p>
        )}
      </main>
    </div>
  );
};

export default MyLists;
