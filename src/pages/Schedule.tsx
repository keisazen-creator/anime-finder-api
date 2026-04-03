import { useState, useEffect } from "react";
import { getAiringSchedule, formatTimeUntil, type ScheduleEntry } from "@/lib/anime-schedule";
import type { AnimeResult } from "@/lib/anime-api";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  onBack: () => void;
  onSelect: (anime: AnimeResult) => void;
}

const SchedulePage = ({ onBack, onSelect }: Props) => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAiringSchedule()
      .then(setSchedule)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (entry: ScheduleEntry) => {
    onSelect({
      id: entry.id,
      title: entry.title,
      coverImage: entry.coverImage,
      episodes: entry.episodes ?? undefined,
      genres: entry.genres,
      averageScore: entry.averageScore ?? undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg text-foreground">Airing Schedule</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <Skeleton className="w-14 h-20 rounded-md shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : schedule.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">No airing schedule available.</p>
        ) : (
          <div className="space-y-2">
            {schedule.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleClick(entry)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-all text-left active:scale-[0.98]"
              >
                <div className="w-14 h-20 rounded-md overflow-hidden shrink-0">
                  <img src={entry.coverImage.large} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                    {entry.title.english || entry.title.romaji}
                  </h3>
                  {entry.nextAiringEpisode && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-primary font-medium">
                        Episode {entry.nextAiringEpisode.episode}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimeUntil(entry.nextAiringEpisode.timeUntilAiring)}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {entry.genres.slice(0, 3).join(" · ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SchedulePage;
