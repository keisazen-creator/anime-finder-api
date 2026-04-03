import { cachedFetch } from "./api-cache";

const ANILIST_URL = "https://graphql.anilist.co";

export interface ScheduleEntry {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  episodes: number | null;
  nextAiringEpisode: {
    airingAt: number;
    episode: number;
    timeUntilAiring: number;
  } | null;
  genres: string[];
  averageScore: number | null;
}

interface ScheduleResponse {
  data?: {
    Page?: {
      media?: ScheduleEntry[];
    };
  };
}

export async function getAiringSchedule(): Promise<ScheduleEntry[]> {
  return cachedFetch("schedule", async () => {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query {
            Page(perPage: 20) {
              media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
                id
                title { romaji english }
                coverImage { large }
                episodes
                nextAiringEpisode { airingAt episode timeUntilAiring }
                genres
                averageScore
              }
            }
          }
        `,
      }),
    });
    const data: ScheduleResponse = await res.json();
    return (data?.data?.Page?.media || []).filter((m) => m.nextAiringEpisode);
  });
}

export function formatTimeUntil(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
