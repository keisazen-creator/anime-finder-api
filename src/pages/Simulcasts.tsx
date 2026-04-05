import { useState, useEffect } from "react";
import { formatTimeUntil, type ScheduleEntry } from "@/lib/anime-schedule";
import { type AnimeResult } from "@/lib/anime-api";
import { getSeasonalAnime } from "@/lib/anime-schedule";
import AnimeCard from "@/components/AnimeCard";
import { AnimeGridSkeleton } from "@/components/AnimeCardSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Season = "WINTER" | "SPRING" | "SUMMER" | "FALL";

interface Props {
  onSelect: (anime: AnimeResult) => void;
}

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month < 3) return "WINTER";
  if (month < 6) return "SPRING";
  if (month < 9) return "SUMMER";
  return "FALL";
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

const SEASON_ORDER: Season[] = ["WINTER", "SPRING", "SUMMER", "FALL"];
const SEASON_DISPLAY: Record<Season, string> = {
  WINTER: "Winter",
  SPRING: "Spring",
  SUMMER: "Summer",
  FALL: "Fall",
};

function buildSeasonOptions(): { season: Season; year: number; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentSeason = getCurrentSeason();
  const currentIdx = SEASON_ORDER.indexOf(currentSeason);

  const options: { season: Season; year: number; label: string }[] = [];

  // 2 seasons back + current + 3 ahead
  for (let offset = -2; offset <= 3; offset++) {
    let idx = currentIdx + offset;
    let year = currentYear;
    while (idx < 0) { idx += 4; year--; }
    while (idx > 3) { idx -= 4; year++; }
    const s = SEASON_ORDER[idx];
    options.push({ season: s, year, label: `${SEASON_DISPLAY[s]} ${year}` });
  }

  return options;
}

const Simulcasts = ({ onSelect }: Props) => {
  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();

  const [season, setSeason] = useState<Season>(currentSeason);
  const [year, setYear] = useState(currentYear);
  const [anime, setAnime] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(true);

  const seasonOptions = buildSeasonOptions();
  const selectedKey = `${season}-${year}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getSeasonalAnime(season, year);
        if (active) setAnime(data);
      } catch {
        if (active) setAnime([]);
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [season, year]);

  const handleSeasonChange = (value: string) => {
    const [s, y] = value.split("-");
    setSeason(s as Season);
    setYear(Number(y));
  };

  const isCurrent = season === currentSeason && year === currentYear;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <h1 className="text-lg font-display font-bold text-foreground">Simulcast Season</h1>
          <Select value={selectedKey} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-auto min-w-[160px] h-9 text-sm bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasonOptions.map((opt) => (
                <SelectItem key={`${opt.season}-${opt.year}`} value={`${opt.season}-${opt.year}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <div className="mb-4">
          <h2 className="text-sm font-display font-semibold text-foreground">
            {SEASON_DISPLAY[season]} {year}{isCurrent ? " — Currently Airing" : ""}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading..." : `${anime.length} titles`}
          </p>
        </div>

        {loading ? (
          <AnimeGridSkeleton count={18} />
        ) : anime.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No simulcasts available for this season.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {anime.map((a, i) => (
              <div key={a.id} className="relative">
                <AnimeCard anime={a} onClick={onSelect} index={i} />
                {a.status === "RELEASING" && a.nextAiringEpisode && (
                  <div className="absolute top-1 left-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[9px] font-medium px-1.5 py-0.5 rounded z-10">
                    EP {a.nextAiringEpisode.episode} · {formatTimeUntil(a.nextAiringEpisode.timeUntilAiring)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Simulcasts;
