const TMDB_KEY = "fdc7143eae0ef3d73d0484e1fb87056c";

export interface AnimeResult {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  description?: string;
  episodes?: number;
  status?: string;
  genres?: string[];
  averageScore?: number;
  seasonYear?: number;
  bannerImage?: string;
}

export async function searchAnime(query: string): Promise<AnimeResult[]> {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ($search: String) {
          Page(perPage: 18) {
            media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
              id
              title { romaji english }
              coverImage { large }
              description
              episodes
              status
              genres
              averageScore
              seasonYear
            }
          }
        }
      `,
      variables: { search: query },
    }),
  });
  const data = await response.json();
  return data?.data?.Page?.media || [];
}

export async function getTrendingAnime(): Promise<AnimeResult[]> {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query {
          Page(perPage: 18) {
            media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
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
      `,
    }),
  });
  const data = await response.json();
  return data?.data?.Page?.media || [];
}

export async function getAnimeDetails(id: number): Promise<AnimeResult | null> {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
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
      variables: { id },
    }),
  });
  const data = await response.json();
  return data?.data?.Media || null;
}

export interface ImdbResult {
  imdb: string;
  tmdb: number;
}

export async function getImdbId(title: string): Promise<ImdbResult | null> {
  const cleanTitle = title.split(":")[0].replace(/season \d+/i, "").trim();

  const search = await fetch(
    `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}`
  );
  const data = await search.json();
  if (!data.results?.length) return null;

  const best =
    data.results.find((r: any) =>
      r.name.toLowerCase().includes(cleanTitle.toLowerCase())
    ) || data.results[0];

  const details = await fetch(
    `https://api.themoviedb.org/3/tv/${best.id}?api_key=${TMDB_KEY}&append_to_response=external_ids`
  );
  const detailData = await details.json();
  const imdb = detailData?.external_ids?.imdb_id;
  if (!imdb) return null;

  return { imdb, tmdb: best.id };
}

export function getStreamUrl(imdb: string, season = 1, episode = 1) {
  return {
    primary: `https://vidfast.pro/tv/${imdb}/${season}/${episode}?autoPlay=true`,
    backup: `https://vidsrc.xyz/embed/tv/${imdb}/${season}/${episode}`,
  };
}
