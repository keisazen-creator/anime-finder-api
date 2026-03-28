import type { AnimeResult } from "@/lib/anime-api";
import { Star } from "lucide-react";

interface Props {
  anime: AnimeResult;
  onClick: (anime: AnimeResult) => void;
  index: number;
}

const AnimeCard = ({ anime, onClick, index }: Props) => {
  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  return (
    <button
      onClick={() => onClick(anime)}
      className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border transition-all duration-200 hover:border-primary/40 active:scale-[0.97] animate-fade-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={anime.coverImage.large}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {score && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-card/90 backdrop-blur-sm text-[10px] font-medium px-1.5 py-0.5 rounded">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            {score}
          </div>
        )}
      </div>
      <div className="p-2 flex-1 flex flex-col gap-0.5">
        <h3 className="text-xs font-display font-semibold text-foreground line-clamp-2 leading-snug">
          {title}
        </h3>
        {anime.genres && anime.genres.length > 0 && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {anime.genres.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
};

export default AnimeCard;
