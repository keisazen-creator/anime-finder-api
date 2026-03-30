import { useState } from "react";
import { getSearchHistory, removeSearchQuery, clearSearchHistory } from "@/lib/search-history";
import { Clock, X, Trash2 } from "lucide-react";

interface Props {
  onSelect: (query: string) => void;
  visible: boolean;
}

const SearchHistory = ({ onSelect, visible }: Props) => {
  const [history, setHistory] = useState(() => getSearchHistory());

  if (!visible || history.length === 0) return null;

  const handleRemove = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeSearchQuery(query);
    setHistory(getSearchHistory());
  };

  const handleClearAll = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground">Recent Searches</span>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {history.map((query) => (
          <button
            key={query}
            onClick={() => onSelect(query)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 line-clamp-1">{query}</span>
            <button
              onClick={(e) => handleRemove(e, query)}
              className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
