"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { UserManagementProvider } from "./UserManagementProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserManagementProvider>
        <TooltipProvider>
          <Toaster />
          {children}
        </TooltipProvider>
      </UserManagementProvider>
    </QueryClientProvider>
  );
}
