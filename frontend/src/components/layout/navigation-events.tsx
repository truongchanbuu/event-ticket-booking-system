"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { routeProgress } from "@/lib/components/route-progress";

export function NavigationEvents() {
  const router = useRouter();

  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = (...args: Parameters<typeof originalPush>) => {
      routeProgress.start();
      originalPush(...args);
    };

    router.replace = (...args: Parameters<typeof originalReplace>) => {
      routeProgress.start();
      originalReplace(...args);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router]);

  return null;
}
