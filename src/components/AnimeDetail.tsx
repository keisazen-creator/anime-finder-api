import { useState, useCallback, useEffect, useMemo } from "react";
import type { AnimeResult } from "@/lib/anime-api";
import { getImdbId, getStreamUrls, type StreamLang, type StreamServers } from "@/lib/anime-api";
import { saveWatchProgress, getWatchProgress } from "@/lib/watch-history";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { getWatchlistStatus, setWatchlistStatus, type WatchlistStatus, WATCHLIST_LABELS } from "@/lib/watchlist";
import AnimeRecommendations from "@/components/AnimeRecommendations";
import SeasonNavigator from "@/components/SeasonNavigator";
import DownloadLinks from "@/components/DownloadLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Loader2, Star, ChevronLeft, ChevronRight, X, Globe, Mic, Heart, Plus, Check } from "lucide-react";

interface Props {
  anime: AnimeResult;
  onBack: () => void;
  onSelect?: (anime: AnimeResult) => void;
}

type ServerKey = keyof StreamServers;

const SERVER_LABELS: Record<ServerKey, string> = {
  megaplayAniwatch: "MegaPlay 1",
  megaplayMal: "MegaPlay 2",
  megaplayAni: "MegaPlay 3",
  vidfast: "VidFast",
  vidsrc: "VidSrc",
};

// ── Episode layout ──
interface RealSeasonLayout {
  type: "real-seasons";
  seasons: { label: string; episodeCount: number; absoluteStart: number }[];
}

interface ChunkedLayout {
  type: "chunked";
  totalEpisodes: number;
  chunkSize: number;
  chunks: { label: string; start: number; end: number }[];
}

type EpisodeLayout = RealSeasonLayout | ChunkedLayout;

const REAL_SEASON_DATA: Record<string, number[]> = {
  "attack on titan": [25, 12, 22, 28],
  "shingeki no kyojin": [25, 12, 22, 28],
  "demon slayer": [26, 18, 11, 14],
  "kimetsu no yaiba": [26, 18, 11, 14],
  "jujutsu kaisen": [24, 23],
  "my hero academia": [13, 25, 25, 25, 25, 25, 21],
  "boku no hero": [13, 25, 25, 25, 25, 25, 21],
  "mob psycho": [12, 13, 12],
  "re:zero": [25, 25, 16],
  "re zero": [25, 25, 16],
  "tokyo ghoul": [12, 12, 12, 12],
  "haikyuu": [25, 25, 10, 25],
  "overlord": [13, 13, 13, 13],
  "konosuba": [10, 10, 11],
  "sword art online": [25, 24, 24, 23],
  "hunter x hunter": [148],
  "dragon ball super": [131],
  "fullmetal alchemist: brotherhood": [64],
  "steins;gate": [24, 23],
  "code geass": [25, 25],
  "psycho-pass": [22, 11, 8],
  "vinland saga": [24, 24],
  "mushoku tensei": [11, 12, 12, 12],
  "spy x family": [12, 13, 12],
  "chainsaw man": [12],
  "blue lock": [24, 14],
  "tokyo revengers": [24, 13, 13],
  "dr. stone": [24, 11, 22],
  "dr stone": [24, 11, 22],
  "fire force": [24, 24],
  "enen no shouboutai": [24, 24],
  "the rising of the shield hero": [25, 13, 12],
  "tate no yuusha": [25, 13, 12],
  "that time i got reincarnated as a slime": [24, 12, 12, 24],
  "tensei shitara slime datta ken": [24, 12, 12, 24],
  "promised neverland": [12, 11],
  "yakusoku no neverland": [12, 11],
  "food wars": [24, 13, 12, 12, 13],
  "shokugeki no souma": [24, 13, 12, 12, 13],
  "danmachi": [13, 12, 12, 22],
  "date a live": [12, 10, 12, 12],
  "high school dxd": [12, 12, 12, 12],
  "oregairu": [13, 13, 12],
  "bungo stray dogs": [12, 12, 12, 13, 11],
  "magi": [25, 25],
  "quintessential quintuplets": [12, 12],
  "go-toubun no hanayome": [12, 12],
  "oshi no ko": [11, 13],
  "solo leveling": [12, 13],
};

const LONG_ANIME_EPISODES: Record<string, number> = {
  "one piece": 1122,
  "naruto shippuden": 500,
  "naruto shippuuden": 500,
  "naruto": 220,
  "bleach": 366,
  "bleach: thousand-year blood war": 52,
  "dragon ball z": 291,
  "dragon ball": 153,
  "dragon ball gt": 64,
  "dragon ball super": 131,
  "fairy tail": 328,
  "fairy tail: final series": 51,
  "gintama": 367,
  "black clover": 170,
  "detective conan": 1150,
  "case closed": 1150,
  "boruto": 293,
  "boruto: naruto next generations": 293,
  "inuyasha": 193,
  "yu-gi-oh": 224,
  "yu-gi-oh! duel monsters": 224,
  "pokemon": 276,
  "pocket monsters": 276,
  "shin chan": 1200,
  "crayon shin-chan": 1200,
  "doraemon": 800,
  "captain tsubasa": 128,
  "hunter x hunter (2011)": 148,
  "hunter x hunter": 148,
  "d.gray-man": 116,
  "katekyo hitman reborn": 203,
  "katekyo hitman reborn!": 203,
  "urusei yatsura": 195,
  "ranma 1/2": 161,
  "ranma ½": 161,
  "rurouni kenshin": 95,
  "slam dunk": 101,
  "yu yu hakusho": 112,
  "saint seiya": 114,
  "major": 154,
  "hajime no ippo": 127,
  "initial d": 86,
  "beyblade": 51,
  "digimon adventure": 54,
};

/** Determine actual available episodes, respecting airing status and format */
function getEffectiveEpisodeCount(anime: AnimeResult): number {
  const isMovie = anime.format === "MOVIE" || anime.format === "SPECIAL" || anime.format === "ONA" && (anime.episodes === 1);
  if (isMovie || anime.format === "MOVIE") return 1;
  
  // For airing anime: use (nextAiringEpisode - 1) as released count
  if (anime.status === "RELEASING" && anime.nextAiringEpisode) {
    return anime.nextAiringEpisode.episode - 1;
  }
  
  return anime.episodes || 24;
}

function getEpisodeLayout(title: string, effectiveEps: number, totalPlanned?: number): EpisodeLayout {
  const t = title.toLowerCase();

  // Check for real seasons first
  for (const [key, seasons] of Object.entries(REAL_SEASON_DATA)) {
    if (t.includes(key)) {
      let absStart = 1;
      const seasonList = seasons.map((count, i) => {
        const s = { label: `Season ${i + 1}`, episodeCount: count, absoluteStart: absStart };
        absStart += count;
        return s;
      });
      return { type: "real-seasons", seasons: seasonList };
    }
  }

  // Check for known long anime
  for (const [key, knownTotal] of Object.entries(LONG_ANIME_EPISODES)) {
    if (t.includes(key)) {
      const total = Math.min(effectiveEps, knownTotal);
      const chunkSize = 100;
      const chunks: ChunkedLayout["chunks"] = [];
      for (let i = 0; i < total; i += chunkSize) {
        const end = Math.min(i + chunkSize, total);
        chunks.push({ label: `${i + 1}–${end}`, start: i + 1, end });
      }
      return { type: "chunked", totalEpisodes: total, chunkSize, chunks };
    }
  }

  // Generic: chunked if many episodes
  if (effectiveEps > 50) {
    const chunkSize = 100;
    const chunks: ChunkedLayout["chunks"] = [];
    for (let i = 0; i < effectiveEps; i += chunkSize) {
      const end = Math.min(i + chunkSize, effectiveEps);
      chunks.push({ label: `${i + 1}–${end}`, start: i + 1, end });
    }
    return { type: "chunked", totalEpisodes: effectiveEps, chunkSize, chunks };
  }

  if (effectiveEps > 13) {
    const s1 = Math.ceil(effectiveEps / 2);
    const s2 = effectiveEps - s1;
    return {
      type: "real-seasons",
      seasons: [
        { label: "Season 1", episodeCount: s1, absoluteStart: 1 },
        { label: "Season 2", episodeCount: s2, absoluteStart: s1 + 1 },
      ],
    };
  }

  return {
    type: "real-seasons",
    seasons: [{ label: "Season 1", episodeCount: effectiveEps, absoluteStart: 1 }],
  };
}

const AnimeDetail = ({ anime, onBack, onSelect }: Props) => {
  const [loading, setLoading] = useState(false);
  const [streamUrls, setStreamUrls] = useState<StreamServers | null>(null);
  const [currentEp, setCurrentEp] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [server, setServer] = useState<ServerKey>("megaplayAni");
  const [lang, setLang] = useState<StreamLang>("sub");
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [faved, setFaved] = useState(() => isFavorite(anime.id));
  const [wlStatus, setWlStatus] = useState<WatchlistStatus | null>(() => getWatchlistStatus(anime.id));
  const [showWlMenu, setShowWlMenu] = useState(false);

  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const isMovie = anime.format === "MOVIE";
  const effectiveEps = getEffectiveEpisodeCount(anime);
  const layout = useMemo(() => getEpisodeLayout(title, effectiveEps, anime.episodes), [title, effectiveEps, anime.episodes]);

  // Computed values based on layout
  const { rangeStart, rangeEnd, totalEps, displayEpisodes } = useMemo(() => {
    if (layout.type === "real-seasons") {
      const s = layout.seasons[selectedIndex] || layout.seasons[0];
      return {
        rangeStart: s.absoluteStart,
        rangeEnd: s.absoluteStart + s.episodeCount - 1,
        totalEps: layout.seasons.reduce((a, b) => a + b.episodeCount, 0),
        // For real seasons, display relative episode numbers (1, 2, 3...)
        displayEpisodes: Array.from({ length: s.episodeCount }, (_, i) => ({
          absolute: s.absoluteStart + i,
          display: i + 1,
        })),
      };
    } else {
      const chunk = layout.chunks[selectedIndex] || layout.chunks[0];
      return {
        rangeStart: chunk.start,
        rangeEnd: chunk.end,
        totalEps: layout.totalEpisodes,
        // For chunked, display absolute numbers (101, 102, 103...)
        displayEpisodes: Array.from({ length: chunk.end - chunk.start + 1 }, (_, i) => ({
          absolute: chunk.start + i,
          display: chunk.start + i,
        })),
      };
    }
  }, [layout, selectedIndex]);

  // Restore saved progress
  useEffect(() => {
    const progress = getWatchProgress(anime.id);
    if (progress) {
      setCurrentEp(progress.episode);
      // Find the correct index for this episode
      if (layout.type === "real-seasons") {
        const idx = layout.seasons.findIndex(
          (s) => progress.episode >= s.absoluteStart && progress.episode < s.absoluteStart + s.episodeCount
        );
        if (idx >= 0) setSelectedIndex(idx);
      } else {
        const idx = layout.chunks.findIndex(
          (c) => progress.episode >= c.start && progress.episode <= c.end
        );
        if (idx >= 0) setSelectedIndex(idx);
      }
    }
  }, [anime.id, layout]);

  const buildStream = useCallback(
    (absEp: number, currentLang: StreamLang, currentImdb: string | null) => {
      // For API calls, we always use absolute episode
      // Season is determined by which season/chunk this episode falls in
      let apiSeason = 1;
      let relativeEp = absEp;
      if (layout.type === "real-seasons") {
        const sIdx = layout.seasons.findIndex(
          (s) => absEp >= s.absoluteStart && absEp < s.absoluteStart + s.episodeCount
        );
        if (sIdx >= 0) {
          apiSeason = sIdx + 1;
          relativeEp = absEp - layout.seasons[sIdx].absoluteStart + 1;
        }
      }
      return getStreamUrls(anime.id, null, absEp, currentLang, currentImdb ?? undefined, apiSeason, relativeEp);
    },
    [anime.id, layout]
  );

  useEffect(() => {
    let active = true;
    if (!imdbId) {
      getImdbId(title).then((result) => {
        if (active && result) setImdbId(result.imdb);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [title, imdbId]);

  const handleWatch = useCallback(
    (absEp: number) => {
      setError(null);
      setCurrentEp(absEp);

      // Find season index for save
      let saveSeason = 1;
      if (layout.type === "real-seasons") {
        const idx = layout.seasons.findIndex(
          (s) => absEp >= s.absoluteStart && absEp < s.absoluteStart + s.episodeCount
        );
        if (idx >= 0) saveSeason = idx + 1;
      }

      saveWatchProgress({
        animeId: anime.id,
        title,
        coverImage: anime.coverImage.large,
        season: saveSeason,
        episode: absEp,
        totalEpisodes: totalEps,
        updatedAt: Date.now(),
      });

      setStreamUrls(buildStream(absEp, lang, imdbId));
      setPlayerOpen(true);
    },
    [imdbId, title, totalEps, lang, buildStream, anime, layout]
  );

  const toggleLang = (newLang: StreamLang) => {
    setLang(newLang);
    if (playerOpen) {
      setStreamUrls(buildStream(currentEp, newLang, imdbId));
    }
  };

  const prevEp = () => { if (currentEp > rangeStart) handleWatch(currentEp - 1); };
  const nextEp = () => { if (currentEp < rangeEnd) handleWatch(currentEp + 1); };
  const closePlayer = () => { setPlayerOpen(false); setStreamUrls(null); };

  const description = anime.description?.replace(/<[^>]*>/g, "") || "";
  const currentUrl = streamUrls ? streamUrls[server] : "";

  const headerLabel = layout.type === "real-seasons"
    ? `${layout.seasons[selectedIndex]?.label} · Episodes 1–${layout.seasons[selectedIndex]?.episodeCount}`
    : `Episodes ${layout.chunks[selectedIndex]?.start}–${layout.chunks[selectedIndex]?.end}`;

  // Player status label
  const playerEpLabel = (() => {
    if (layout.type === "real-seasons") {
      const sIdx = layout.seasons.findIndex(
        (s) => currentEp >= s.absoluteStart && currentEp < s.absoluteStart + s.episodeCount
      );
      if (sIdx >= 0) {
        const rel = currentEp - layout.seasons[sIdx].absoluteStart + 1;
        return `S${sIdx + 1} · E${rel}`;
      }
    }
    return `E${currentEp}`;
  })();

  // Stats label
  // Stats label — show airing progress
  const statsLabel = (() => {
    if (isMovie) return "Movie";
    if (anime.status === "RELEASING" && anime.nextAiringEpisode && anime.episodes) {
      return `Airing · ${effectiveEps}/${anime.episodes} released`;
    }
    if (anime.status === "RELEASING" && anime.nextAiringEpisode) {
      return `Airing · ${effectiveEps} released`;
    }
    if (layout.type === "real-seasons") {
      return `${layout.seasons.length} season${layout.seasons.length > 1 ? "s" : ""}`;
    }
    return `${totalEps} eps`;
  })();

  // ── Fullscreen player overlay ──
  if (playerOpen && streamUrls) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
          <Button variant="destructive" size="sm" onClick={closePlayer} className="gap-1.5 h-8 text-xs">
            <X className="w-3.5 h-3.5" /> Close
          </Button>
          <span className="text-xs font-medium text-foreground">
            {playerEpLabel} · {lang.toUpperCase()}
          </span>
          <div className="w-16" />
        </div>

        <div className="flex-1 min-h-0 bg-black">
          <iframe
            key={currentUrl}
            src={currentUrl}
            className="w-full h-full border-none"
            allowFullScreen
            allow="autoplay; fullscreen"
            title={`${title} - ${playerEpLabel}`}
          />
        </div>

        <div className="bg-card border-t border-border shrink-0">
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto">
            {(Object.keys(SERVER_LABELS) as ServerKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setServer(key)}
                className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  server === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {SERVER_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border-t border-border flex-wrap">
            <div className="flex bg-secondary rounded-md overflow-hidden">
              <button
                onClick={() => toggleLang("sub")}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  lang === "sub" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-accent"
                }`}
              >
                <Globe className="w-3 h-3" /> SUB
              </button>
              <button
                onClick={() => toggleLang("dub")}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  lang === "dub" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-accent"
                }`}
              >
                <Mic className="w-3 h-3" /> DUB
              </button>
            </div>


            <div className="flex gap-1.5 ml-auto">
              <Button variant="secondary" size="sm" onClick={prevEp} disabled={currentEp <= rangeStart} className="gap-1 h-8 text-xs">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={nextEp} disabled={currentEp >= rangeEnd} className="gap-1 h-8 text-xs">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[30vh] overflow-y-auto bg-card border-t border-border p-2.5 shrink-0">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1.5">
            {displayEpisodes.map((ep) => (
              <button
                key={ep.absolute}
                onClick={() => handleWatch(ep.absolute)}
                className={`h-8 rounded-md text-[11px] font-medium transition-colors ${
                  ep.absolute === currentEp
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {ep.display}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view ──
  return (
    <div className="animate-fade-up">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <img src={anime.coverImage.large} alt={title} className="w-full rounded-lg shadow-[0_8px_32px_hsl(var(--primary)/0.12)]" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight" style={{ lineHeight: "1.15" }}>
              {title}
            </h1>
            <div className="flex items-center gap-1 shrink-0 mt-1">
              {/* Watchlist + button */}
              <div className="relative">
                <button
                  onClick={() => setShowWlMenu((p) => !p)}
                  className={`p-2 rounded-full transition-colors hover:bg-secondary active:scale-90 ${wlStatus ? "text-primary" : "text-muted-foreground"}`}
                >
                  {wlStatus ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
                {showWlMenu && (
                  <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px] animate-fade-up">
                    {(Object.keys(WATCHLIST_LABELS) as WatchlistStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setWatchlistStatus(anime.id, s, title, anime.coverImage.large);
                          setWlStatus(s);
                          setShowWlMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-accent ${
                          wlStatus === s ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {WATCHLIST_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Favorite heart */}
              <button
                onClick={() => {
                  toggleFavorite({ animeId: anime.id, title, coverImage: anime.coverImage.large });
                  setFaved((p) => !p);
                }}
                className="p-2 rounded-full transition-colors hover:bg-secondary active:scale-90"
              >
                <Heart className={`w-5 h-5 ${faved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center text-sm">
            {score && (
              <span className="inline-flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-md font-medium">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {score}
              </span>
            )}
            {anime.seasonYear && (
              <span className="bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground">{anime.seasonYear}</span>
            )}
            <span className="bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground">{statsLabel}</span>
            {anime.status && (
              <span className="bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground capitalize">
                {anime.status.toLowerCase().replace("_", " ")}
              </span>
            )}
          </div>

          {anime.genres && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.map((g) => (
                <span key={g} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{g}</span>
              ))}
            </div>
          )}

          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-prose line-clamp-4">{description}</p>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-secondary rounded-md overflow-hidden">
              <button
                onClick={() => setLang("sub")}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                  lang === "sub" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-accent"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> SUB
              </button>
              <button
                onClick={() => setLang("dub")}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                  lang === "dub" ? "bg-primary text-primary-foreground" : "text-secondary-foreground hover:bg-accent"
                }`}
              >
                <Mic className="w-3.5 h-3.5" /> DUB
              </button>
            </div>

            <Button onClick={() => handleWatch(rangeStart)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Watch
            </Button>
          </div>

          {/* Episode grid with range selector */}
          {!isMovie ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                {(layout.type === "chunked" ? layout.chunks.length > 1 : layout.seasons.length > 1) && (
                  <Select
                    value={String(selectedIndex)}
                    onValueChange={(v) => setSelectedIndex(Number(v))}
                  >
                    <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {layout.type === "chunked"
                        ? layout.chunks.map((chunk, i) => (
                            <SelectItem key={i} value={String(i)} className="text-xs">
                              Episodes {chunk.label}
                            </SelectItem>
                          ))
                        : layout.seasons.map((s, i) => (
                            <SelectItem key={i} value={String(i)} className="text-xs">
                              {s.label} ({s.episodeCount} eps)
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">{headerLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                {displayEpisodes.map((ep) => (
                  <Button
                    key={ep.absolute}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleWatch(ep.absolute)}
                    disabled={loading}
                    className={`w-12 h-9 text-xs font-medium ${
                      ep.absolute === currentEp ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                    }`}
                  >
                    {loading && ep.absolute === currentEp ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      ep.display
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Button onClick={() => handleWatch(1)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Watch Movie
            </Button>
          )}

          <SeasonNavigator anime={anime} onSelect={onSelect!} />
          <DownloadLinks title={title} episode={currentEp} anilistId={anime.id} />
          {onSelect && <AnimeRecommendations anime={anime} onSelect={onSelect} />}
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
