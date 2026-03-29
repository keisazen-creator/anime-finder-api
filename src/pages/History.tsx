import { useState } from "react";
import { getWatchHistory, type WatchEntry } from "@/lib/watch-history";
import { getAllFavorites, type FavoriteEntry } from "@/lib/favorites";
import type { AnimeResult } from "@/lib/anime-api";
import { ArrowLeft, History, Heart, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onBack: () => void;
  onSelect: (anime: AnimeResult) => void;
}

const HistoryPage = ({ onBack, onSelect }: Props) => {
  const [tab, setTab] = useState<"history" | "favorites">("history");
  const [history] = useState<WatchEntry[]>(() => getWatchHistory().sort((a, b) => b.updatedAt - a.updatedAt));
  const [favorites] = useState<FavoriteEntry[]>(() => getAllFavorites());

  const toAnimeResult = (entry: { animeId: number; title: string; coverImage: string; totalEpisodes?: number }): AnimeResult => ({
    id: entry.animeId,
    title: { romaji: entry.title, english: entry.title },
    coverImage: { large: entry.coverImage },
    episodes: (entry as WatchEntry).totalEpisodes,
  });

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex bg-secondary rounded-lg overflow-hidden">
            <button
              onClick={() => setTab("history")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                tab === "history" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-accent"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Watch History
            </button>
            <button
              onClick={() => setTab("favorites")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                tab === "favorites" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-accent"
              }`}
            >
              <Heart className="w-3.5 h-3.5" /> Favorites ({favorites.length})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === "history" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-lg font-display font-bold text-foreground">Watch History</h1>
              <span className="text-xs text-muted-foreground">({history.length} anime)</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Total episodes watched: {history.reduce((sum, h) => sum + h.episode, 0)}
            </p>

            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No watch history yet. Start watching anime!</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <button
                    key={entry.animeId}
                    onClick={() => onSelect(toAnimeResult(entry))}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.98] text-left"
                  >
                    <img
                      src={entry.coverImage}
                      alt={entry.title}
                      className="w-12 h-16 object-cover rounded-md shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1">{entry.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        S{entry.season} · E{entry.episode} / {entry.totalEpisodes}
                      </p>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min((entry.episode / entry.totalEpisodes) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{formatTime(entry.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "favorites" && (
          <>
            <h1 className="text-lg font-display font-bold text-foreground mb-6">
              Favorites
            </h1>

            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No favorites yet. Tap the ♥ on any anime to save it!</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {favorites.map((entry) => (
                  <button
                    key={entry.animeId}
                    onClick={() => onSelect(toAnimeResult(entry))}
                    className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border transition-all hover:border-primary/40 active:scale-[0.97]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={entry.coverImage}
                        alt={entry.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="text-[11px] font-semibold text-foreground line-clamp-2">{entry.title}</h3>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
