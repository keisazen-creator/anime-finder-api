import { useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

const SearchBar = ({ onSearch, isSearching }: Props) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search anime..."
        className="w-full h-10 pl-10 pr-10 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {isSearching && (
        <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer bg-[length:200%_100%] rounded-full" />
      )}
    </form>
  );
};

export default SearchBar;
