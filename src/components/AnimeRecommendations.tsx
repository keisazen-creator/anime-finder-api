import { useState, useEffect } from "react";
import { type AnimeResult } from "@/lib/anime-api";
import { Sparkles } from "lucide-react";

interface Props {
  anime: AnimeResult;
  onSelect: (anime: AnimeResult) => void;
}

interface AniListRecommendationResponse {
  data?: {
    Media?: {
      recommendations?: {
        nodes?: Array<{
          mediaRecommendation?: AnimeResult | null;
        }>;
      };
    };
  };
}

const AnimeRecommendations = ({ anime, onSelect }: Props) => {
  const [recs, setRecs] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              recommendations(perPage: 8, sort: RATING_DESC) {
                nodes {
                  mediaRecommendation {
                    id
                    title { romaji english }
                    coverImage { large }
                    episodes
                    averageScore
                    genres
                  }
                }
              }
            }
          }
        `,
        variables: { id: anime.id },
      }),
    })
      .then((r) => r.json())
      .then((data: AniListRecommendationResponse) => {
        if (!active) return;
        const nodes = data?.data?.Media?.recommendations?.nodes || [];
        const results = nodes
          .map((n) => n.mediaRecommendation)
          .filter((m): m is AnimeResult => m !== null && m !== undefined);
        setRecs(results);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [anime.id]);

  if (loading || recs.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">You Might Also Like</h3>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
        {recs.map((rec) => (
          <button
            key={rec.id}
            onClick={() => onSelect(rec)}
            className="group flex flex-col rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.97]"
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={rec.coverImage.large}
                alt={rec.title.english || rec.title.romaji}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-1.5">
              <h4 className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">
                {rec.title.english || rec.title.romaji}
              </h4>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnimeRecommendations;
