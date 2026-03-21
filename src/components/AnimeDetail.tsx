import { useState } from "react";
import type { AnimeResult } from "@/lib/anime-api";
import { getImdbId, getStreamUrl } from "@/lib/anime-api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Loader2, ExternalLink, Star } from "lucide-react";

interface Props {
  anime: AnimeResult;
  onBack: () => void;
}

const AnimeDetail = ({ anime, onBack }: Props) => {
  const [loading, setLoading] = useState(false);
  const [streamUrls, setStreamUrls] = useState<{ primary: string; backup: string } | null>(null);
  const [episode, setEpisode] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const totalEpisodes = anime.episodes || 12;

  const handleWatch = async (ep: number) => {
    setLoading(true);
    setError(null);
    setEpisode(ep);
    try {
      const result = await getImdbId(title);
      if (!result) {
        setError("Could not find this anime on TMDB. Try a different title.");
        return;
      }
      setStreamUrls(getStreamUrl(result.imdb, 1, ep));
    } catch {
      setError("Failed to fetch streaming link.");
    } finally {
      setLoading(false);
    }
  };

  const description = anime.description?.replace(/<[^>]*>/g, "") || "";

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

          {streamUrls && (
            <div className="bg-secondary rounded-lg p-4 space-y-3 animate-scale-in">
              <p className="text-sm font-medium text-foreground">
                Now playing Episode {episode}
              </p>
              <div className="aspect-video rounded-md overflow-hidden border border-border">
                <iframe
                  src={streamUrls.primary}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; fullscreen"
                  title={`${title} - Episode ${episode}`}
                />
              </div>
              <div className="flex gap-2">
                <a
                  href={streamUrls.primary}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Open primary
                </a>
                <a
                  href={streamUrls.backup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Backup player
                </a>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Episodes</p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                <Button
                  key={ep}
                  variant={ep === episode && streamUrls ? "default" : "secondary"}
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
