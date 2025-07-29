import { AdminHeader } from "@/components/admin/admin-header";
import ProtectedRoute from "@/components/ProtectRoute";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div>
        <AdminHeader adminEmail="" />
        <main>{children}</main>
        <footer></footer>
      </div>
    </ProtectedRoute>
  );
}
