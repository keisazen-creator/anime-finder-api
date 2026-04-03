import { useState, useEffect } from "react";
import { getRelatedSeasons, getSequel, type SeasonEntry } from "@/lib/anime-relations";
import type { AnimeResult } from "@/lib/anime-api";
import { SkipForward, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  anime: AnimeResult;
  onSelect: (anime: AnimeResult) => void;
}

const SeasonNavigator = ({ anime, onSelect }: Props) => {
  const [sequel, setSequel] = useState<SeasonEntry | null>(null);
  const [related, setRelated] = useState<SeasonEntry[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    getSequel(anime.id).then((s) => { if (active) setSequel(s); }).catch(() => {});
    getRelatedSeasons(anime.id).then((r) => { if (active) setRelated(r); }).catch(() => {});
    return () => { active = false; };
  }, [anime.id]);

  const handleNavigate = (entry: SeasonEntry) => {
    onSelect({
      id: entry.id,
      title: entry.title,
      coverImage: entry.coverImage,
      episodes: entry.episodes,
      status: entry.status,
      genres: entry.genres,
      averageScore: entry.averageScore,
      seasonYear: entry.seasonYear,
    });
  };

  if (!sequel && related.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Next Season quick button */}
      {sequel && (
        <button
          onClick={() => handleNavigate(sequel)}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 hover:border-primary/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-16 rounded-md overflow-hidden shrink-0">
            <img src={sequel.coverImage.large} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Next Season</p>
            <p className="text-sm font-semibold text-foreground line-clamp-1">
              {sequel.title.english || sequel.title.romaji}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {sequel.episodes ? `${sequel.episodes} episodes` : ""}
              {sequel.seasonYear ? ` · ${sequel.seasonYear}` : ""}
            </p>
          </div>
          <SkipForward className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Related seasons expandable */}
      {related.length > 1 && (
        <>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            {showAll ? "Hide" : "Show"} all related ({related.length})
          </button>

          {showAll && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {related.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleNavigate(entry)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-all text-left active:scale-[0.97]"
                >
                  <div className="w-8 h-11 rounded overflow-hidden shrink-0">
                    <img src={entry.coverImage.large} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary font-medium uppercase">{entry.relationType}</p>
                    <p className="text-[11px] font-medium text-foreground line-clamp-1">
                      {entry.title.english || entry.title.romaji}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SeasonNavigator;
