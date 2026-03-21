import { useState, useEffect } from "react";
import { searchAnime, getTrendingAnime, type AnimeResult } from "@/lib/anime-api";
import AnimeCard from "@/components/AnimeCard";
import AnimeDetail from "@/components/AnimeDetail";
import SearchBar from "@/components/SearchBar";
import { Flame } from "lucide-react";

const Index = () => {
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [trending, setTrending] = useState<AnimeResult[]>([]);
  const [selected, setSelected] = useState<AnimeResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getTrendingAnime().then(setTrending);
  }, []);

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

  const displayList = query ? results : trending;
  const heading = query ? `Results for "${query}"` : "Trending Now";

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
          <h1 className="font-display font-bold text-lg text-foreground shrink-0 tracking-tight">
            <span className="text-primary">Kogemi</span>
          </h1>
          <SearchBar onSearch={handleSearch} isSearching={searching} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          {!query && <Flame className="w-5 h-5 text-primary" />}
          <h2 className="text-lg font-display font-semibold text-foreground">{heading}</h2>
        </div>

        {displayList.length === 0 && !searching && (
          <p className="text-muted-foreground text-sm text-center py-16">
            {query ? "No anime found. Try a different search." : "Loading trending anime..."}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayList.map((anime, i) => (
            <AnimeCard key={anime.id} anime={anime} onClick={setSelected} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
