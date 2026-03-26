import { useState, useCallback } from "react";
import type { AnimeResult } from "@/lib/anime-api";
import { getImdbId, getStreamUrl } from "@/lib/anime-api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Loader2, Star, ChevronLeft, ChevronRight, X, Monitor } from "lucide-react";

interface Props {
  anime: AnimeResult;
  onBack: () => void;
}

function getEpisodeCount(title: string, apiEpisodes?: number): number {
  const eps = apiEpisodes || 0;
  if (eps >= 15) return eps;

  const t = title.toLowerCase();
  if (t.includes("one piece")) return 1100;
  if (t.includes("naruto shippuden")) return 500;
  if (t.includes("naruto")) return 220;
  if (t.includes("bleach")) return 366;
  if (t.includes("dragon ball")) return 153;
  if (t.includes("detective conan") || t.includes("case closed")) return 1100;
  if (t.includes("fairy tail")) return 328;
  if (t.includes("gintama")) return 367;
  if (t.includes("hunter x hunter")) return 148;

  return eps || 24;
}

const AnimeDetail = ({ anime, onBack }: Props) => {
  const [loading, setLoading] = useState(false);
  const [streamUrls, setStreamUrls] = useState<{ primary: string; backup: string } | null>(null);
  const [episode, setEpisode] = useState(1);
  const [server, setServer] = useState<"primary" | "backup">("primary");
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [imdbId, setImdbId] = useState<string | null>(null);

  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const totalEpisodes = getEpisodeCount(title, anime.episodes);

  const handleWatch = useCallback(async (ep: number) => {
    setLoading(true);
    setError(null);
    setEpisode(ep);
    try {
      let id = imdbId;
      if (!id) {
        const result = await getImdbId(title);
        if (!result) {
          setError("Could not find this anime on TMDB. Try a different title.");
          return;
        }
        id = result.imdb;
        setImdbId(id);
      }
      setStreamUrls(getStreamUrl(id, 1, ep));
      setPlayerOpen(true);
    } catch {
      setError("Failed to fetch streaming link.");
    } finally {
      setLoading(false);
    }
  }, [imdbId, title]);

  const switchServer = (val: string) => {
    setServer(val as "primary" | "backup");
  };

  const prevEp = () => {
    if (episode > 1) handleWatch(episode - 1);
  };

  const nextEp = () => {
    if (episode < totalEpisodes) handleWatch(episode + 1);
  };

  const closePlayer = () => {
    setPlayerOpen(false);
    setStreamUrls(null);
  };

  const description = anime.description?.replace(/<[^>]*>/g, "") || "";
  const currentUrl = streamUrls ? streamUrls[server] : "";

  // Fullscreen player overlay
  if (playerOpen && streamUrls) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-up">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
          <Button variant="destructive" size="sm" onClick={closePlayer} className="gap-1.5">
            <X className="w-4 h-4" /> Close
          </Button>
          <span className="text-sm font-medium text-foreground">
            Episode {episode}
          </span>
          <div className="w-20" />
        </div>

        {/* Player */}
        <div className="flex-1 min-h-0 bg-black">
          <iframe
            src={currentUrl}
            className="w-full h-full border-none"
            allowFullScreen
            allow="autoplay; fullscreen"
            title={`${title} - Episode ${episode}`}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3 bg-card border-t border-border shrink-0">
          <Select value={server} onValueChange={switchServer}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <Monitor className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={prevEp} disabled={episode <= 1} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button variant="secondary" size="sm" onClick={nextEp} disabled={episode >= totalEpisodes} className="gap-1.5">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Episode grid */}
        <div className="max-h-[35vh] overflow-y-auto bg-card border-t border-border p-3 shrink-0">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
            {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
              <button
                key={ep}
                onClick={() => handleWatch(ep)}
                className={`h-9 rounded-md text-xs font-medium transition-colors ${
                  ep === episode
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {ep}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Detail view
  return (
    <div className="animate-fade-up">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <img
            src={anime.coverImage.large}
            alt={title}
            className="w-full rounded-lg shadow-[0_8px_32px_hsl(var(--primary)/0.12)]"
          />
        </div>

        <div className="flex-1 space-y-4">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight" style={{ lineHeight: "1.15" }}>
            {title}
          </h1>

          <div className="flex flex-wrap gap-2 items-center text-sm">
            {score && (
              <span className="inline-flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-md font-medium">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {score}
              </span>
            )}
            {anime.seasonYear && (
              <span className="bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground">
                {anime.seasonYear}
              </span>
            )}
            <span className="bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground">
              {totalEpisodes} eps
            </span>
            {anime.status && (
              <span className="bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground capitalize">
                {anime.status.toLowerCase().replace("_", " ")}
              </span>
            )}
          </div>

          {anime.genres && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.map((g) => (
                <span key={g} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {g}
                </span>
              ))}
            </div>
          )}

          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-prose line-clamp-4">
              {description}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          {/* Quick play button */}
          <Button onClick={() => handleWatch(1)} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Watch Episode 1
          </Button>

          {/* Episode grid */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Episodes</p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                <Button
                  key={ep}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleWatch(ep)}
                  disabled={loading}
                  className="w-12 h-9 text-xs font-medium"
                >
                  {loading && ep === episode ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    ep
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
