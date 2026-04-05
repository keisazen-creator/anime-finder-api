import { useState, useEffect, useCallback } from "react";
import { searchAnime, getTrendingAnime, getAnimeByGenre, GENRE_LIST, type AnimeResult, type GenreFilter } from "@/lib/anime-api";
import { getAiringSchedule, formatTimeUntil, type ScheduleEntry } from "@/lib/anime-schedule";
import AnimeCard from "@/components/AnimeCard";
import { AnimeGridSkeleton } from "@/components/AnimeCardSkeleton";
import SearchBar from "@/components/SearchBar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Clock, Search } from "lucide-react";

type BrowseTab = "all" | "simulcasts" | "genres" | "music";

interface Props {
  onSelect: (anime: AnimeResult) => void;
}

const Browse = ({ onSelect }: Props) => {
  const [tab, setTab] = useState<BrowseTab>("all");
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [trending, setTrending] = useState<AnimeResult[]>([]);
  const [genreResults, setGenreResults] = useState<AnimeResult[]>([]);
  const [activeGenre, setActiveGenre] = useState<GenreFilter>("Action");
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [t, s] = await Promise.all([getTrendingAnime(), getAiringSchedule()]);
        if (active) { setTrending(t); setSchedule(s); }
      } catch {}
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (!q) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchAnime(q)); } catch { setResults([]); }
    setSearching(false);
  }, []);

  const handleGenreChange = async (genre: GenreFilter) => {
    setActiveGenre(genre);
    setLoading(true);
    try { setGenreResults(await getAnimeByGenre(genre)); } catch { setGenreResults([]); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === "genres") handleGenreChange(activeGenre);
    if (tab === "music") handleGenreChange("Music" as GenreFilter);
  }, [tab]);

  const browseGenres = GENRE_LIST.filter((g) => g !== "Trending" && g !== "Music");

  const tabs: { id: BrowseTab; label: string }[] = [
    { id: "all", label: "All Anime" },
    { id: "simulcasts", label: "Simulcasts" },
    { id: "genres", label: "Genres" },
    { id: "music", label: "Music" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          {searchMode ? (
            <div className="flex-1">
              <SearchBar
                key={searchKey}
                onSearch={handleSearch}
                isSearching={searching}
                onClearBack={() => { setSearchMode(false); setQuery(""); setResults([]); setSearchKey((k) => k + 1); }}
              />
            </div>
          ) : (
            <>
              <h1 className="text-lg font-display font-bold text-foreground">Browse</h1>
              <button onClick={() => setSearchMode(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
        {!searchMode && (
          <ScrollArea className="max-w-6xl mx-auto">
            <div className="flex gap-1 px-4 pb-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Search results */}
        {query && (
          <>
            <h2 className="text-sm font-display font-semibold text-foreground mb-3">Results for "{query}"</h2>
            {searching ? <AnimeGridSkeleton count={12} /> : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No results found.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {results.map((a, i) => <AnimeCard key={a.id} anime={a} onClick={onSelect} index={i} />)}
              </div>
            )}
          </>
        )}

        {!query && tab === "all" && (
          <>
            {/* Airing schedule strip */}
            {schedule.length > 0 && (
              <section className="mb-6">
                <h2 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Airing Soon
                </h2>
                <ScrollArea>
                  <div className="flex gap-2.5 pb-2">
                    {schedule.slice(0, 10).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => onSelect({
                          id: entry.id,
                          title: entry.title,
                          coverImage: entry.coverImage,
                          episodes: entry.episodes || undefined,
                          genres: entry.genres,
                          averageScore: entry.averageScore || undefined,
                        })}
                        className="shrink-0 w-28 group"
                      >
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card border border-border group-hover:border-primary/40 transition-all">
                          <img src={entry.coverImage.large} alt={entry.title.english || entry.title.romaji} className="w-full h-full object-cover" loading="lazy" />
                          {entry.nextAiringEpisode && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-1.5">
                              <p className="text-[9px] font-medium text-primary">EP {entry.nextAiringEpisode.episode}</p>
                              <p className="text-[9px] text-foreground">{formatTimeUntil(entry.nextAiringEpisode.timeUntilAiring)}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-foreground line-clamp-1 mt-1">{entry.title.english || entry.title.romaji}</p>
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </section>
            )}

            <h2 className="text-sm font-display font-semibold text-foreground mb-3">Popular Anime</h2>
            {loading && trending.length === 0 ? <AnimeGridSkeleton count={18} /> : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {trending.map((a, i) => <AnimeCard key={a.id} anime={a} onClick={onSelect} index={i} />)}
              </div>
            )}
          </>
        )}

        {!query && tab === "simulcasts" && (
          <>
            <h2 className="text-sm font-display font-semibold text-foreground mb-3">Currently Airing</h2>
            {schedule.length === 0 ? (
              loading ? <AnimeGridSkeleton count={12} /> : <p className="text-sm text-muted-foreground text-center py-12">No airing anime found.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {schedule.map((entry, i) => (
                  <AnimeCard
                    key={entry.id}
                    anime={{
                      id: entry.id,
                      title: entry.title,
                      coverImage: entry.coverImage,
                      episodes: entry.episodes || undefined,
                      genres: entry.genres,
                      averageScore: entry.averageScore || undefined,
                      status: "RELEASING",
                      nextAiringEpisode: entry.nextAiringEpisode ? { episode: entry.nextAiringEpisode.episode, timeUntilAiring: entry.nextAiringEpisode.timeUntilAiring } : undefined,
                    }}
                    onClick={onSelect}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!query && tab === "genres" && (
          <>
            <ScrollArea className="mb-4">
              <div className="flex gap-1 pb-2">
                {browseGenres.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleGenreChange(g)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activeGenre === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            {loading ? <AnimeGridSkeleton count={18} /> : genreResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No anime found for this genre.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {genreResults.map((a, i) => <AnimeCard key={a.id} anime={a} onClick={onSelect} index={i} />)}
              </div>
            )}
          </>
        )}

        {!query && tab === "music" && (
          <>
            <h2 className="text-sm font-display font-semibold text-foreground mb-3">Music Anime</h2>
            {loading ? <AnimeGridSkeleton count={12} /> : genreResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No music anime found.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {genreResults.map((a, i) => <AnimeCard key={a.id} anime={a} onClick={onSelect} index={i} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Browse;
