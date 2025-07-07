import { Skeleton } from "@/components/ui/skeleton";

interface EventLoadingSkeletonProps {
  count?: number;
  viewMode?: "grid" | "list";
}

export default function EventLoadingSkeleton({
  count = 6,
  viewMode = "grid",
}: EventLoadingSkeletonProps) {
  const gridClass =
    viewMode === "grid"
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1";

  return (
    <div className={`grid gap-6 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${
            viewMode === "list" ? "flex space-x-4" : "flex flex-col"
          }`}
        >
          <Skeleton
            className={
              viewMode === "list"
                ? "h-24 w-24 flex-shrink-0"
                : "h-48 w-full rounded-t-lg"
            }
          />
          <div
            className={
              viewMode === "list" ? "flex-1 space-y-2" : "flex-1 space-y-2 p-4"
            }
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
