import { useState, useEffect } from "react";
import { searchAnime, getTrendingAnime, getAnimeByGenre, GENRE_LIST, type AnimeResult, type GenreFilter } from "@/lib/anime-api";
import { getRecentlyWatched, type WatchEntry } from "@/lib/watch-history";
import AnimeCard from "@/components/AnimeCard";
import AnimeDetail from "@/components/AnimeDetail";
import SearchBar from "@/components/SearchBar";
import { Flame, History, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import kogemiLogo from "@/assets/kogemi-logo.png";

const Index = () => {
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [trending, setTrending] = useState<AnimeResult[]>([]);
  const [selected, setSelected] = useState<AnimeResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<GenreFilter>("Trending");
  const [genreResults, setGenreResults] = useState<AnimeResult[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [recentlyWatched, setRecentlyWatched] = useState<WatchEntry[]>([]);

  useEffect(() => {
    getTrendingAnime().then(setTrending);
    setRecentlyWatched(getRecentlyWatched());
  }, []);

  // Refresh watch history when returning from detail
  useEffect(() => {
    if (!selected) {
      setRecentlyWatched(getRecentlyWatched());
    }
  }, [selected]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchAnime(q);
      setResults(data);
    } finally {
      setSearching(false);
    }
  };

  const handleGenreChange = async (genre: GenreFilter) => {
    setActiveGenre(genre);
    if (genre === "Trending") {
      setGenreResults([]);
      return;
    }
    setGenreLoading(true);
    try {
      const data = await getAnimeByGenre(genre);
      setGenreResults(data);
    } finally {
      setGenreLoading(false);
    }
  };

  const displayList = query ? results : activeGenre === "Trending" ? trending : genreResults;
  const heading = query
    ? `Results for "${query}"`
    : activeGenre === "Trending"
    ? "Trending Now"
    : activeGenre;
  const isLoading = searching || genreLoading;

  if (selected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <AnimeDetail anime={selected} onBack={() => setSelected(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src={kogemiLogo} alt="Kogemi" className="w-7 h-7" />
            <span className="font-display font-bold text-lg text-primary tracking-tight">Kogemi</span>
          </div>
          <SearchBar onSearch={handleSearch} isSearching={searching} />
        </div>
      </header>

      {/* Genre tabs */}
      {!query && (
        <div className="sticky top-14 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
          <ScrollArea className="max-w-6xl mx-auto">
            <div className="flex gap-1 px-4 py-2.5">
              {GENRE_LIST.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreChange(genre)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeGenre === genre
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Continue Watching */}
        {!query && recentlyWatched.length > 0 && activeGenre === "Trending" && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-display font-semibold text-foreground">Continue Watching</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
              {recentlyWatched.map((entry) => (
                <button
                  key={entry.animeId}
                  onClick={() =>
                    setSelected({
                      id: entry.animeId,
                      title: { romaji: entry.title, english: entry.title },
                      coverImage: { large: entry.coverImage },
                      episodes: entry.totalEpisodes,
                    })
                  }
                  className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_32px_hsl(var(--primary)/0.15)] active:scale-[0.97]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={entry.coverImage}
                      alt={entry.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-primary rounded-r-full"
                        style={{ width: `${Math.min((entry.episode / entry.totalEpisodes) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-display font-semibold text-foreground line-clamp-1">{entry.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      S{entry.season} · E{entry.episode}
                      <ChevronRight className="w-3 h-3" />
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Main grid */}
        <div className="flex items-center gap-2 mb-4">
          {!query && activeGenre === "Trending" && <Flame className="w-5 h-5 text-primary" />}
          <h2 className="text-lg font-display font-semibold text-foreground">{heading}</h2>
        </div>

        {displayList.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-sm text-center py-16">
            {query ? "No anime found. Try a different search." : "Loading..."}
          </p>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
          {displayList.map((anime, i) => (
            <AnimeCard key={anime.id} anime={anime} onClick={setSelected} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
