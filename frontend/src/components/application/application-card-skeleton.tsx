import { Card, CardContent } from "../ui/card";
import ApplicationCard from "./application-card";

export default function ApplicationCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-white/70 backdrop-blur-sm border-0 shadow-lg">
      {/* Status indicator line skeleton */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />

      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left section */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1">
                {/* ID and Status badges */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
                </div>

                {/* Organization name */}
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-1" />

                {/* Category */}
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />
              </div>
            </div>

            {/* Date and time info */}
            <div className="flex justify-start items-center gap-6">
              <div className="flex justify-start items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Right section - Action button */}
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for multiple skeleton cards
export function ApplicationCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:gap-6">
      {Array.from({ length: count }, (_, index) => (
        <ApplicationCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Alternative with staggered animation
export function ApplicationCardSkeletonStaggered({
  count = 6,
}: {
  count?: number;
}) {
  return (
    <div className="grid gap-4 md:gap-6">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
          className="animate-fade-in"
        >
          <ApplicationCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Usage example component
export function ApplicationListWithSkeleton({
  applications,
  isLoading,
}: {
  applications?: any[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <ApplicationCardSkeletonGrid count={8} />;
  }

  return (
    <div className="grid gap-4 md:gap-6">
      {applications?.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}
