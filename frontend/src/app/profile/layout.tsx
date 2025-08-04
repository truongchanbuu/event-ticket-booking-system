import Header from "@/components/app-header";
import ProtectedRoute from "@/components/ProtectRoute";
import { ReactNode } from "react";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Header />
      <main>{children}</main>
    </ProtectedRoute>
  );
}
