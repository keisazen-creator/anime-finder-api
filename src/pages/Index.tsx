import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { searchAnime, getTrendingAnime, getAnimeByGenre, getRandomAnime, GENRE_LIST, type AnimeResult, type GenreFilter } from "@/lib/anime-api";
import { getRecentlyWatched, removeFromHistory, type WatchEntry } from "@/lib/watch-history";
import AnimeCard from "@/components/AnimeCard";
import { AnimeGridSkeleton } from "@/components/AnimeCardSkeleton";
import SearchBar from "@/components/SearchBar";
import BottomNav, { type NavTab } from "@/components/BottomNav";
import { Flame, History, ChevronRight, X, Loader2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import kogemiLogo from "@/assets/kogemi-logo.png";

const AnimeDetail = lazy(() => import("@/components/AnimeDetail"));
const MyLists = lazy(() => import("@/pages/MyLists"));
const Browse = lazy(() => import("@/pages/Browse"));
const Simulcasts = lazy(() => import("@/pages/Simulcasts"));

const Index = () => {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [randomLoading, setRandomLoading] = useState(false);
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [trending, setTrending] = useState<AnimeResult[]>([]);
  const [navStack, setNavStack] = useState<AnimeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<GenreFilter>("Trending");
  const [genreResults, setGenreResults] = useState<AnimeResult[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentlyWatched, setRecentlyWatched] = useState<WatchEntry[]>([]);
  const [searchKey, setSearchKey] = useState(0);

  const selected = navStack.length > 0 ? navStack[navStack.length - 1] : null;

  // Browser back button support
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state?.navDepth !== undefined && state.navDepth > 0) {
        setNavStack((prev) => prev.slice(0, state.navDepth));
        setActiveTab("home");
      } else if (state?.tab) {
        setNavStack([]);
        setActiveTab(state.tab);
      } else {
        setNavStack([]);
        setActiveTab("home");
        setQuery("");
        setSearchKey((k) => k + 1);
      }
    };
    window.addEventListener("popstate", handlePopState);
    if (!window.history.state) {
      window.history.replaceState({ tab: "home", navDepth: 0 }, "");
    }
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;
    const loadTrending = async () => {
      setInitialLoading(true);
      setLoadError(null);
      try {
        const data = await getTrendingAnime();
        if (active) setTrending(data);
      } catch {
        if (active) { setTrending([]); setLoadError("Couldn't load anime right now."); }
      } finally {
        if (active) setInitialLoading(false);
      }
    };
    loadTrending();
    setRecentlyWatched(getRecentlyWatched());
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) setRecentlyWatched(getRecentlyWatched());
  }, [selected]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    setLoadError(null);
    if (!q) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchAnime(q)); } catch { setResults([]); setLoadError("Search is unavailable."); }
    setSearching(false);
  }, []);

  const handleGenreChange = async (genre: GenreFilter) => {
    setActiveGenre(genre);
    setLoadError(null);
    if (genre === "Trending") { setGenreResults([]); return; }
    setGenreLoading(true);
    try { setGenreResults(await getAnimeByGenre(genre)); } catch { setGenreResults([]); }
    setGenreLoading(false);
  };

  const selectAnime = (anime: AnimeResult) => {
    setNavStack((prev) => {
      const next = [...prev, anime];
      window.history.pushState({ tab: activeTab, navDepth: next.length }, "");
      return next;
    });
  };

  const goBack = () => window.history.back();

  const goHome = () => {
    setNavStack([]);
    setQuery("");
    setSearchKey((k) => k + 1);
    setActiveTab("home");
    window.history.pushState({ tab: "home", navDepth: 0 }, "");
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === "random") {
      handleRandom();
      return;
    }
    setNavStack([]);
    setActiveTab(tab);
    window.history.pushState({ tab, navDepth: 0 }, "");
  };

  const handleRandom = async () => {
    setRandomLoading(true);
    try {
      const anime = await getRandomAnime();
      if (anime) { setActiveTab("home"); selectAnime(anime); }
    } catch {}
    setRandomLoading(false);
  };

  const displayList = query ? results : activeGenre === "Trending" ? trending : genreResults;
  const heading = query ? `Results for "${query}"` : activeGenre === "Trending" ? "Trending Now" : activeGenre;
  const isLoading = searching || genreLoading || initialLoading;

  // Show detail view (regardless of tab)
  if (selected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 pb-20">
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <AnimeDetail anime={selected} onBack={goBack} onSelect={selectAnime} />
          </Suspense>
        </div>
        <BottomNav active={activeTab} onChange={handleTabChange} randomLoading={randomLoading} />
      </div>
    );
  }

  // Non-home tabs
  if (activeTab === "lists") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <MyLists onSelect={selectAnime} />
        <BottomNav active={activeTab} onChange={handleTabChange} randomLoading={randomLoading} />
      </Suspense>
    );
  }

  if (activeTab === "browse") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Browse onSelect={selectAnime} />
        <BottomNav active={activeTab} onChange={handleTabChange} randomLoading={randomLoading} />
      </Suspense>
    );
  }

  if (activeTab === "simulcasts") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Simulcasts onSelect={selectAnime} />
        <BottomNav active={activeTab} onChange={handleTabChange} randomLoading={randomLoading} />
      </Suspense>
    );
  }

  // Home tab
  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={goHome} className="flex items-center gap-2 shrink-0">
            <img src={kogemiLogo} alt="Kogemi" className="w-7 h-7" />
            <span className="font-display font-bold text-lg text-primary tracking-tight hidden sm:inline">Kogemi</span>
          </button>
          <SearchBar key={searchKey} onSearch={handleSearch} isSearching={searching} onClearBack={query ? goHome : undefined} />
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-display font-semibold text-foreground">Continue Watching</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
              {recentlyWatched.map((entry) => (
                <button
                  key={entry.animeId}
                  onClick={() => selectAnime({
                    id: entry.animeId,
                    title: { romaji: entry.title, english: entry.title },
                    coverImage: { large: entry.coverImage },
                    episodes: entry.totalEpisodes,
                  })}
                  className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border transition-all duration-300 hover:border-primary/40 active:scale-[0.97]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.animeId); setRecentlyWatched(getRecentlyWatched()); }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div className="h-full bg-primary rounded-r-full" style={{ width: `${Math.min((entry.episode / entry.totalEpisodes) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-display font-semibold text-foreground line-clamp-1">{entry.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      S{entry.season} · E{entry.episode} <ChevronRight className="w-3 h-3" />
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

        {isLoading && displayList.length === 0 ? (
          <AnimeGridSkeleton count={18} />
        ) : displayList.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">
            {query ? "No anime found. Try a different search." : loadError || "No anime available right now."}
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {displayList.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} onClick={selectAnime} index={i} />
            ))}
          </div>
        )}
      </main>

      <BottomNav active={activeTab} onChange={handleTabChange} randomLoading={randomLoading} />
    </div>
  );
};

export default Index;
