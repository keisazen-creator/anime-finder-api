import { useState, useEffect } from "react";
import { getAiringSchedule, formatTimeUntil, type ScheduleEntry } from "@/lib/anime-schedule";
import { getTrendingAnime, type AnimeResult } from "@/lib/anime-api";
import AnimeCard from "@/components/AnimeCard";
import { AnimeGridSkeleton } from "@/components/AnimeCardSkeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, Clock } from "lucide-react";

type Season = "winter" | "spring" | "summer" | "fall";

interface Props {
  onSelect: (anime: AnimeResult) => void;
}

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month < 3) return "winter";
  if (month < 6) return "spring";
  if (month < 9) return "summer";
  return "fall";
}

const SEASON_LABELS: Record<Season, string> = {
  winter: "❄️ Winter",
  spring: "🌸 Spring",
  summer: "☀️ Summer",
  fall: "🍂 Fall",
};

const Simulcasts = ({ onSelect }: Props) => {
  const [season, setSeason] = useState<Season>(getCurrentSeason());
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAiringSchedule();
        if (active) setSchedule(data);
      } catch {}
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const seasons: Season[] = ["winter", "spring", "summer", "fall"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">Simulcasts</h1>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-2">
          {seasons.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                season === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {SEASON_LABELS[s]}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        <h2 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {SEASON_LABELS[season]} {new Date().getFullYear()} — Currently Airing
        </h2>

        {loading ? (
          <AnimeGridSkeleton count={12} />
        ) : schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No simulcasts available for this season.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {schedule.map((entry, i) => (
              <div key={entry.id} className="relative">
                <AnimeCard
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
                {entry.nextAiringEpisode && (
                  <div className="absolute top-1 left-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[9px] font-medium px-1.5 py-0.5 rounded z-10">
                    EP {entry.nextAiringEpisode.episode} · {formatTimeUntil(entry.nextAiringEpisode.timeUntilAiring)}
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
