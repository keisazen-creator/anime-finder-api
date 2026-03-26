import { useState, useCallback } from "react";
import type { AnimeResult } from "@/lib/anime-api";
import { getImdbId, getStreamUrl } from "@/lib/anime-api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Loader2, Star, ChevronLeft, ChevronRight, X, Monitor, Layers } from "lucide-react";

interface Props {
  anime: AnimeResult;
  onBack: () => void;
}

interface SeasonInfo {
  totalSeasons: number;
  episodesPerSeason: number[];
}

function getSeasonInfo(title: string, apiEpisodes?: number): SeasonInfo {
  const t = title.toLowerCase();

  // Known multi-season anime
  if (t.includes("one piece")) return { totalSeasons: 21, episodesPerSeason: Array(21).fill(50).map((_, i) => i === 20 ? 50 : 52) };
  if (t.includes("naruto shippuden")) return { totalSeasons: 21, episodesPerSeason: Array(21).fill(24) };
  if (t.includes("naruto") && !t.includes("shippuden")) return { totalSeasons: 9, episodesPerSeason: Array(9).fill(25).map((_, i) => i === 8 ? 20 : 25) };
  if (t.includes("bleach")) return { totalSeasons: 16, episodesPerSeason: Array(16).fill(23) };
  if (t.includes("dragon ball super")) return { totalSeasons: 5, episodesPerSeason: [14, 18, 35, 47, 17] };
  if (t.includes("dragon ball z")) return { totalSeasons: 9, episodesPerSeason: Array(9).fill(33) };
  if (t.includes("dragon ball")) return { totalSeasons: 1, episodesPerSeason: [153] };
  if (t.includes("fairy tail")) return { totalSeasons: 9, episodesPerSeason: Array(9).fill(36) };
  if (t.includes("gintama")) return { totalSeasons: 4, episodesPerSeason: [49, 51, 51, 51] };
  if (t.includes("hunter x hunter")) return { totalSeasons: 6, episodesPerSeason: [21, 22, 24, 25, 12, 44] };
  if (t.includes("my hero academia") || t.includes("boku no hero")) return { totalSeasons: 7, episodesPerSeason: [13, 25, 25, 25, 25, 25, 21] };
  if (t.includes("attack on titan") || t.includes("shingeki no kyojin")) return { totalSeasons: 4, episodesPerSeason: [25, 12, 22, 28] };
  if (t.includes("demon slayer") || t.includes("kimetsu no yaiba")) return { totalSeasons: 4, episodesPerSeason: [26, 18, 11, 14] };
  if (t.includes("jujutsu kaisen")) return { totalSeasons: 2, episodesPerSeason: [24, 23] };
  if (t.includes("sword art online")) return { totalSeasons: 4, episodesPerSeason: [25, 24, 24, 23] };
  if (t.includes("black clover")) return { totalSeasons: 4, episodesPerSeason: [51, 51, 52, 16] };
  if (t.includes("mob psycho")) return { totalSeasons: 3, episodesPerSeason: [12, 13, 12] };
  if (t.includes("re:zero") || t.includes("re zero")) return { totalSeasons: 3, episodesPerSeason: [25, 25, 16] };
  if (t.includes("tokyo ghoul")) return { totalSeasons: 4, episodesPerSeason: [12, 12, 12, 12] };
  if (t.includes("haikyuu")) return { totalSeasons: 4, episodesPerSeason: [25, 25, 10, 25] };
  if (t.includes("overlord")) return { totalSeasons: 4, episodesPerSeason: [13, 13, 13, 13] };
  if (t.includes("konosuba")) return { totalSeasons: 3, episodesPerSeason: [10, 10, 11] };

  // Default: single season
  const eps = apiEpisodes || 24;
  if (eps > 26) {
    const seasons = Math.ceil(eps / 13);
    const perSeason = Array(seasons).fill(13);
    perSeason[seasons - 1] = eps - 13 * (seasons - 1);
    return { totalSeasons: seasons, episodesPerSeason: perSeason };
  }
  return { totalSeasons: 1, episodesPerSeason: [eps] };
}

const AnimeDetail = ({ anime, onBack }: Props) => {
  const [loading, setLoading] = useState(false);
  const [streamUrls, setStreamUrls] = useState<{ primary: string; backup: string } | null>(null);
  const [episode, setEpisode] = useState(1);
  const [season, setSeason] = useState(1);
  const [server, setServer] = useState<"primary" | "backup">("primary");
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [imdbId, setImdbId] = useState<string | null>(null);

  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const seasonInfo = getSeasonInfo(title, anime.episodes);
  const totalEpisodes = seasonInfo.episodesPerSeason[season - 1] || 12;

  const handleWatch = useCallback(async (ep: number, s?: number) => {
    const targetSeason = s ?? season;
    setLoading(true);
    setError(null);
    setEpisode(ep);
    if (s !== undefined) setSeason(s);
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
      setStreamUrls(getStreamUrl(id, targetSeason, ep));
      setPlayerOpen(true);
    } catch {
      setError("Failed to fetch streaming link.");
    } finally {
      setLoading(false);
    }
  }, [imdbId, title, season]);

  const changeSeason = (val: string) => {
    const s = parseInt(val);
    setSeason(s);
    setEpisode(1);
    if (imdbId) {
      setStreamUrls(getStreamUrl(imdbId, s, 1));
    }
  };

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
            S{season} · E{episode}
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
            title={`${title} - S${season}E${episode}`}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 py-3 bg-card border-t border-border shrink-0 flex-wrap">
          {seasonInfo.totalSeasons > 1 && (
            <Select value={String(season)} onValueChange={changeSeason}>
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <Layers className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: seasonInfo.totalSeasons }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Season {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={server} onValueChange={switchServer}>
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <Monitor className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={prevEp} disabled={episode <= 1} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button variant="secondary" size="sm" onClick={nextEp} disabled={episode >= totalEpisodes} className="gap-1">
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
              {seasonInfo.totalSeasons > 1 ? `${seasonInfo.totalSeasons} seasons` : `${totalEpisodes} eps`}
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

          {/* Season + Play */}
          <div className="flex items-center gap-3 flex-wrap">
            {seasonInfo.totalSeasons > 1 && (
              <Select value={String(season)} onValueChange={changeSeason}>
                <SelectTrigger className="w-[140px] h-10">
                  <Layers className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: seasonInfo.totalSeasons }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Season {i + 1} ({seasonInfo.episodesPerSeason[i]} eps)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => handleWatch(1)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Watch S{season}E1
            </Button>
          </div>

          {/* Episode grid */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              Season {season} · {totalEpisodes} episodes
            </p>
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
