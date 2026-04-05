import { Home, BookmarkCheck, Compass, Radio, Shuffle } from "lucide-react";

export type NavTab = "home" | "lists" | "browse" | "simulcasts" | "random";

interface Props {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  randomLoading?: boolean;
}

const tabs: { id: NavTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "lists", label: "My Lists", icon: BookmarkCheck },
  { id: "browse", label: "Browse", icon: Compass },
  { id: "simulcasts", label: "Simulcasts", icon: Radio },
  { id: "random", label: "Random", icon: Shuffle },
];

const BottomNav = ({ active, onChange, randomLoading }: Props) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              disabled={tab.id === "random" && randomLoading}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  tab.id === "random" && randomLoading ? "animate-spin" : ""
                }`}
              />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
