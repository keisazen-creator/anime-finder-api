import { cachedFetch } from "./api-cache";

const TMDB_KEY = "fdc7143eae0ef3d73d0484e1fb87056c";
const KOGEMI_API = "https://kogemi-api-3.onrender.com";
const REQUEST_TIMEOUT = 10000;

export interface AnimeResult {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  description?: string;
  episodes?: number;
  status?: string;
  format?: string;
  genres?: string[];
  averageScore?: number;
  seasonYear?: number;
  bannerImage?: string;
  nextAiringEpisode?: { episode: number; timeUntilAiring: number } | null;
}

export const GENRE_LIST = [
  "Trending",
  "Action",
  "Romance",
  "Comedy",
  "Fantasy",
  "Adventure",
  "Drama",
  "Sci-Fi",
  "Horror",
  "Slice of Life",
  "Mystery",
  "Supernatural",
  "Sports",
  "Ecchi",
  "Hentai",
] as const;

export type GenreFilter = (typeof GENRE_LIST)[number];

interface AniListPageResponse {
  data?: {
    Page?: {
      media?: AnimeResult[];
    };
  };
}

interface AniListMediaResponse {
  data?: {
    Media?: AnimeResult | null;
  };
}

interface TmdbSearchResult {
  id: number;
  name?: string;
  original_name?: string;
  original_language?: string;
  genre_ids?: number[];
  popularity?: number;
}

interface TmdbSearchResponse {
  results?: TmdbSearchResult[];
}

interface TmdbDetailResponse {
  external_ids?: {
    imdb_id?: string | null;
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postAniList<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return fetchJson<T>("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
}

function normalizeAnimeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bseason\s+\d+\b/g, " ")
    .replace(/\bpart\s+\d+\b/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTmdbCandidate(candidate: TmdbSearchResult, normalizedTitle: string): number {
  const names = [candidate.name, candidate.original_name]
    .filter(Boolean)
    .map((name) => normalizeAnimeTitle(name as string));

  let score = 0;

  if (names.includes(normalizedTitle)) score += 120;
  if (names.some((name) => name.startsWith(normalizedTitle) || normalizedTitle.startsWith(name))) score += 70;
  if (names.some((name) => name.includes(normalizedTitle) || normalizedTitle.includes(name))) score += 35;
  if (candidate.genre_ids?.includes(16)) score += 60;
  if (candidate.original_language === "ja") score += 25;
  if (candidate.original_language === "en" && !candidate.genre_ids?.includes(16)) score -= 40;
  score += Math.min(candidate.popularity ?? 0, 100) / 20;

  return score;
}

export async function searchAnime(query: string): Promise<AnimeResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  return cachedFetch(`search:${cleanQuery.toLowerCase()}`, async () => {
    try {
      return await fetchJson<AnimeResult[]>(`${KOGEMI_API}/search?q=${encodeURIComponent(cleanQuery)}`);
    } catch {
      const data = await postAniList<AniListPageResponse>(
        `
          query ($search: String) {
            Page(perPage: 18) {
              media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                id
                title { romaji english }
                coverImage { large }
                description
                episodes
                status
                format
                genres
                averageScore
                seasonYear
                nextAiringEpisode { episode timeUntilAiring }
              }
            }
          }
        `,
        { search: cleanQuery }
      );
      return data?.data?.Page?.media || [];
    }
  });
}

export async function getTrendingAnime(): Promise<AnimeResult[]> {
  return cachedFetch("trending", async () => {
    const data = await postAniList<AniListPageResponse>(`
      query {
        Page(perPage: 18) {
          media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
            id
            title { romaji english }
            coverImage { large }
            description
            episodes
            status
            format
            genres
            averageScore
            seasonYear
            bannerImage
            nextAiringEpisode { episode timeUntilAiring }
          }
        }
      }
    `);
    return data?.data?.Page?.media || [];
  });
}

export async function getAnimeByGenre(genre: string): Promise<AnimeResult[]> {
  return cachedFetch(`genre:${genre}`, async () => {
    const isAdult = genre === "Hentai";
    const data = await postAniList<AniListPageResponse>(
      `
        query ($genre: String, $isAdult: Boolean) {
          Page(perPage: 18) {
            media(type: ANIME, genre: $genre, sort: POPULARITY_DESC, isAdult: $isAdult) {
              id
              title { romaji english }
              coverImage { large }
              description
              episodes
              status
              format
              genres
              averageScore
              seasonYear
              bannerImage
              nextAiringEpisode { episode timeUntilAiring }
            }
          }
        }
      `,
      { genre, isAdult }
    );
    return data?.data?.Page?.media || [];
  });
}

export async function getAnimeDetails(id: number): Promise<AnimeResult | null> {
  const data = await postAniList<AniListMediaResponse>(
    `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english }
          coverImage { large }
          description
          episodes
          status
          genres
          averageScore
          seasonYear
          bannerImage
        }
      }
    `,
    { id }
  );

  return data?.data?.Media || null;
}

export async function getRandomAnime(): Promise<AnimeResult | null> {
  const page = Math.floor(Math.random() * 50) + 1;
  const data = await postAniList<AniListPageResponse>(`
    query ($page: Int) {
      Page(page: $page, perPage: 1) {
        media(type: ANIME, sort: POPULARITY_DESC, status_in: [FINISHED, RELEASING]) {
          id
          title { romaji english }
          coverImage { large }
          description
          episodes
          status
          genres
          averageScore
          seasonYear
          bannerImage
        }
      }
    }
  `, { page });
  const media = data?.data?.Page?.media;
  return media && media.length > 0 ? media[0] : null;
}

export interface ImdbResult {
  imdb: string;
  tmdb: number;
}

export async function getImdbId(title: string): Promise<ImdbResult | null> {
  const cleanTitle = normalizeAnimeTitle(title);
  if (!cleanTitle) return null;

  const searchData = await fetchJson<TmdbSearchResponse>(
    `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}`
  );

  const rankedResults = (searchData.results || [])
    .map((result) => ({ result, score: scoreTmdbCandidate(result, cleanTitle) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const candidate of rankedResults) {
    const detailData = await fetchJson<TmdbDetailResponse>(
      `https://api.themoviedb.org/3/tv/${candidate.result.id}?api_key=${TMDB_KEY}&append_to_response=external_ids`
    );

    const imdb = detailData?.external_ids?.imdb_id;
    if (imdb) {
      return { imdb, tmdb: candidate.result.id };
    }
  }

  return null;
}

export type StreamLang = "sub" | "dub";

export interface StreamServers {
  megaplayAniwatch: string;
  megaplayMal: string;
  megaplayAni: string;
  vidfast: string;
  vidsrc: string;
}

export function getStreamUrls(
  anilistId: number,
  malId: number | null,
  episode: number,
  lang: StreamLang = "sub",
  imdb?: string,
  season?: number,
  relativeEp?: number
): StreamServers {
  const epId = anilistId * 100 + episode; // rough unique ep id
  return {
    megaplayAniwatch: `https://megaplay.buzz/stream/s-2/${epId}/${lang}`,
    megaplayMal: malId
      ? `https://megaplay.buzz/stream/mal/${malId}/${episode}/${lang}`
      : `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${lang}`,
    megaplayAni: `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${lang}`,
    vidfast: imdb
      ? `https://vidfast.pro/tv/${imdb}/${season ?? 1}/${relativeEp ?? episode}?autoPlay=true&theme=7c3aed`
      : `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${lang}`,
    vidsrc: imdb
      ? `https://vidsrc.xyz/embed/tv?imdb=${imdb}&season=${season ?? 1}&episode=${relativeEp ?? episode}`
      : `https://megaplay.buzz/stream/ani/${anilistId}/${episode}/${lang}`,
  };
}
