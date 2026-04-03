import type { StreamServers, StreamLang } from "@/lib/anime-api";
import { Download, ExternalLink } from "lucide-react";

interface Props {
  title: string;
  episode: number;
  anilistId: number;
}

const DOWNLOAD_SOURCES = [
  { name: "AnimePahe", url: (title: string) => `https://animepahe.ru/anime/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}` },
  { name: "GoGoAnime", url: (title: string) => `https://gogoanime3.cc/search.html?keyword=${encodeURIComponent(title)}` },
  { name: "Nyaa.si", url: (title: string) => `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(title)}` },
];

const DownloadLinks = ({ title, episode, anilistId }: Props) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">Download Sources</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {DOWNLOAD_SOURCES.map((source) => (
          <a
            key={source.name}
            href={source.url(title)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {source.name}
          </a>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">External links. Kogemi does not host any files.</p>
    </div>
  );
};

export default DownloadLinks;
