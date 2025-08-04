import { AdminHeader } from "@/components/admin/admin-header";
import ProtectedRoute from "@/components/ProtectRoute";
import ROLE from "@/schema/enums/role";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
      <div>
        <AdminHeader adminEmail="" />
        <main>{children}</main>
        <footer></footer>
      </div>
    </ProtectedRoute>
  );
}
