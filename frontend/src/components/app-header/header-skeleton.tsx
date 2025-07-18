// app-header/HeaderSkeleton.tsx

import { APP_NAME } from "@/constants/app";
import { headerCls, logoCls } from "@/styles/app-header/style";
import { HeaderVariant } from "@/types/app-header/type";

interface HeaderSkeletonProps {
  variant: HeaderVariant;
  sticky?: boolean;
}

export default function HeaderSkeleton({
  variant,
  sticky,
}: HeaderSkeletonProps) {
  return (
    <header className={headerCls(variant, sticky)}>
      <div className="mx-auto flex justify-between items-center">
        <div className={logoCls(variant)}>{APP_NAME}</div>
        <div className="hidden md:flex items-center space-x-6">
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </header>
  );
}
