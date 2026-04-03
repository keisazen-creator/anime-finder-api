import { Skeleton } from "@/components/ui/skeleton";

const AnimeCardSkeleton = () => (
  <div className="flex flex-col rounded-lg overflow-hidden bg-card border border-border">
    <Skeleton className="aspect-[3/4] w-full" />
    <div className="p-2 space-y-1.5">
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-2.5 w-3/5" />
    </div>
  </div>
);

export const AnimeGridSkeleton = ({ count = 12 }: { count?: number }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <AnimeCardSkeleton key={i} />
    ))}
  </div>
);

export default AnimeCardSkeleton;
