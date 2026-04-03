import { cachedFetch } from "./api-cache";

const ANILIST_URL = "https://graphql.anilist.co";

interface SequelNode {
  relationType: string;
  node: {
    id: number;
    title: { romaji: string; english: string | null };
    coverImage: { large: string };
    episodes: number | null;
    status: string;
    format: string;
    seasonYear: number | null;
    averageScore: number | null;
    genres: string[];
  };
}

interface SequelResponse {
  data?: {
    Media?: {
      relations?: {
        edges?: SequelNode[];
      };
    };
  };
}

export interface SeasonEntry {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  episodes?: number;
  status?: string;
  genres?: string[];
  averageScore?: number;
  seasonYear?: number;
  relationType: string;
}

export async function getRelatedSeasons(animeId: number): Promise<SeasonEntry[]> {
  return cachedFetch(`relations:${animeId}`, async () => {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              relations {
                edges {
                  relationType
                  node {
                    id
                    title { romaji english }
                    coverImage { large }
                    episodes
                    status
                    format
                    seasonYear
                    averageScore
                    genres
                  }
                }
              }
            }
          }
        `,
        variables: { id: animeId },
      }),
    });
    const data: SequelResponse = await res.json();
    const edges = data?.data?.Media?.relations?.edges || [];
    
    return edges
      .filter((e) => ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"].includes(e.relationType) && e.node.format === "TV")
      .sort((a, b) => {
        const order = ["PREQUEL", "SEQUEL", "SIDE_STORY", "ALTERNATIVE"];
        return order.indexOf(a.relationType) - order.indexOf(b.relationType);
      })
      .map((e) => ({
        id: e.node.id,
        title: e.node.title,
        coverImage: e.node.coverImage,
        episodes: e.node.episodes ?? undefined,
        status: e.node.status,
        genres: e.node.genres,
        averageScore: e.node.averageScore ?? undefined,
        seasonYear: e.node.seasonYear ?? undefined,
        relationType: e.relationType,
      }));
  });
}

// Get just the sequel (next season)
export async function getSequel(animeId: number): Promise<SeasonEntry | null> {
  const related = await getRelatedSeasons(animeId);
  return related.find((r) => r.relationType === "SEQUEL") || null;
}
