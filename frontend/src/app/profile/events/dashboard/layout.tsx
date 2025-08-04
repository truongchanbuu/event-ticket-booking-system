"use client";

import ProtectedRoute from "@/components/ProtectRoute";
import ROLE from "@/schema/enums/role";
import React from "react";

export default function EventDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={[ROLE.EVENT_ORGANIZER]}>
      <main>{children}</main>
    </ProtectedRoute>
  );
}
