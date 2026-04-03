import { useState, useCallback, useEffect, useMemo } from "react";
import type { AnimeResult } from "@/lib/anime-api";
import { getImdbId, getStreamUrls, type StreamLang, type StreamServers } from "@/lib/anime-api";
import { saveWatchProgress, getWatchProgress } from "@/lib/watch-history";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import AnimeRecommendations from "@/components/AnimeRecommendations";
import SeasonNavigator from "@/components/SeasonNavigator";
import DownloadLinks from "@/components/DownloadLinks";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Play, Loader2, Star, ChevronLeft, ChevronRight, X, Layers, Globe, Mic, Heart } from "lucide-react";

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

// ── Episode layout types ──
// "real-seasons": short anime with distinct seasons (AOT, Demon Slayer)
//   → Each season shows E1, E2, E3... (relative), but we send absolute to API
// "chunked": long anime with 100+ eps (One Piece, Naruto)
//   → No seasons, just episode range tabs: 1-100, 101-200, etc.

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

// Known multi-season anime with REAL season data
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
  "hunter x hunter": [21, 22, 24, 25, 12, 44],
  "dragon ball super": [14, 18, 35, 47, 17],
};

// Known long-running anime (chunked episodes, no real seasons)
const LONG_ANIME_EPISODES: Record<string, number> = {
  "one piece": 1200,
  "naruto shippuden": 500,
  "naruto": 220,
  "bleach": 366,
  "dragon ball z": 291,
  "dragon ball": 153,
  "fairy tail": 328,
  "gintama": 367,
  "black clover": 170,
  "detective conan": 1150,
  "case closed": 1150,
};

function getEpisodeLayout(title: string, apiEpisodes?: number): EpisodeLayout {
  const t = title.toLowerCase();

  // Check for real seasons first (short-to-medium anime)
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
  for (const [key, totalEps] of Object.entries(LONG_ANIME_EPISODES)) {
    if (t.includes(key)) {
      const chunkSize = 100;
      const chunks: ChunkedLayout["chunks"] = [];
      for (let i = 0; i < totalEps; i += chunkSize) {
        const end = Math.min(i + chunkSize, totalEps);
        chunks.push({ label: `${i + 1}–${end}`, start: i + 1, end });
      }
      return { type: "chunked", totalEpisodes: totalEps, chunkSize, chunks };
    }
  }

  // Generic: if API says many episodes → chunked; otherwise single season
  const eps = apiEpisodes || 24;
  if (eps > 50) {
    const chunkSize = 100;
    const chunks: ChunkedLayout["chunks"] = [];
    for (let i = 0; i < eps; i += chunkSize) {
      const end = Math.min(i + chunkSize, eps);
      chunks.push({ label: `${i + 1}–${end}`, start: i + 1, end });
    }
    return { type: "chunked", totalEpisodes: eps, chunkSize, chunks };
  }

  if (eps > 13) {
    // 2-season split
    const s1 = Math.ceil(eps / 2);
    const s2 = eps - s1;
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
    seasons: [{ label: "Season 1", episodeCount: eps, absoluteStart: 1 }],
  };
}

const AnimeDetail = ({ anime, onBack, onSelect }: Props) => {
  const [loading, setLoading] = useState(false);
  const [streamUrls, setStreamUrls] = useState<StreamServers | null>(null);
  const [currentEp, setCurrentEp] = useState(1); // always absolute
  const [selectedIndex, setSelectedIndex] = useState(0); // season index or chunk index
  const [server, setServer] = useState<ServerKey>("megaplayAni");
  const [lang, setLang] = useState<StreamLang>("sub");
  const [error, setError] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [faved, setFaved] = useState(() => isFavorite(anime.id));

  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const layout = useMemo(() => getEpisodeLayout(title, anime.episodes), [title, anime.episodes]);

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

  const changeIndex = (val: string) => {
    const idx = parseInt(val);
    setSelectedIndex(idx);
    // Set episode to start of new range
    if (layout.type === "real-seasons") {
      setCurrentEp(layout.seasons[idx].absoluteStart);
    } else {
      setCurrentEp(layout.chunks[idx].start);
    }
  };

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

  // Selector options
  const selectorOptions = layout.type === "real-seasons"
    ? layout.seasons.map((s, i) => ({ value: String(i), label: `${s.label} (${s.episodeCount} eps)` }))
    : layout.chunks.map((c, i) => ({ value: String(i), label: `Episodes ${c.label}` }));

  const selectorLabel = layout.type === "real-seasons"
    ? layout.seasons[selectedIndex]?.label || "Season 1"
    : `Ep ${layout.chunks[selectedIndex]?.label || "1–100"}`;

  const headerLabel = layout.type === "real-seasons"
    ? `${layout.seasons[selectedIndex]?.label} · Episodes 1–${layout.seasons[selectedIndex]?.episodeCount}`
    : `Episodes ${layout.chunks[selectedIndex]?.start}–${layout.chunks[selectedIndex]?.end}`;

  const showSelector = selectorOptions.length > 1;

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
  const statsLabel = layout.type === "real-seasons"
    ? `${layout.seasons.length} season${layout.seasons.length > 1 ? "s" : ""}`
    : `${totalEps} eps`;

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

            {showSelector && (
              <Select value={String(selectedIndex)} onValueChange={changeIndex}>
                <SelectTrigger className="w-auto max-w-[140px] h-8 text-[11px]">
                  <Layers className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight" style={{ lineHeight: "1.15" }}>
              {title}
            </h1>
            <button
              onClick={() => {
                toggleFavorite({ animeId: anime.id, title, coverImage: anime.coverImage.large });
                setFaved((p) => !p);
              }}
              className="shrink-0 mt-1 p-2 rounded-full transition-colors hover:bg-secondary active:scale-90"
            >
              <Heart className={`w-5 h-5 ${faved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
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

            {showSelector && (
              <Select value={String(selectedIndex)} onValueChange={changeIndex}>
                <SelectTrigger className="w-[180px] h-10">
                  <Layers className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={() => handleWatch(rangeStart)} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Watch
            </Button>
          </div>

          {/* Episode grid */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{headerLabel}</p>
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

          {onSelect && <AnimeRecommendations anime={anime} onSelect={onSelect} />}
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
