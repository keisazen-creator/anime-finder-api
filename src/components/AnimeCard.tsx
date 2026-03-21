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
      className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-card border border-border transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_32px_hsl(var(--primary)/0.15)] active:scale-[0.97] animate-fade-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={anime.coverImage.large}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-card/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-md">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {score}
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="text-sm font-display font-semibold text-foreground line-clamp-2 leading-snug">
          {title}
        </h3>
        {anime.genres && anime.genres.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {anime.genres.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
};

export default AnimeCard;
