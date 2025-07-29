import * as React from "react";
import Link from "next/link";
import {
  User as UserIcon,
  LogOut,
  Ticket,
  FileText,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppUser } from "@/schema/user";
import ROLE from "@/schema/enums/role";
import {
  dropdownCls,
  dropdownItemCls,
  linkCls,
} from "@/styles/app-header/style";

interface UserMenuProps {
  variant: "default" | "dark" | "gradient";
  userProfile: AppUser | null;
  onSignOut: () => void;
}

export default function UserMenu({
  variant,
  userProfile,
  onSignOut,
}: UserMenuProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const getDisplayName = () =>
    userProfile?.username || userProfile?.email?.split("@")[0] || "User";
  const getAvatarSrc = () => userProfile?.photoUrl || "";
  const effectiveRole = userProfile?.role;

  const closeMenu = () => setIsUserMenuOpen(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setIsUserMenuOpen((v) => !v)}
        className={`${linkCls(
          variant
        )} flex items-center space-x-2 hover:text-black hover:bg-gray`}
      >
        <Avatar className="w-8 h-8 border-2 border-gray-300 hover:border-blue-500 transition-colors">
          <AvatarImage src={getAvatarSrc()} alt="User Avatar" />
          <AvatarFallback>
            <UserIcon className="w-4 h-4 text-gray-600" />
          </AvatarFallback>
        </Avatar>
        <span className="max-w-24 truncate">{getDisplayName()}</span>
      </Button>

      {isUserMenuOpen && (
        <div className={dropdownCls(variant)}>
          <Link
            href="/profile"
            className={dropdownItemCls(variant)}
            onClick={closeMenu}
          >
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </div>
          </Link>

          {effectiveRole === ROLE.EVENT_ORGANIZER && (
            <Link
              href="/profile/my-events"
              className={dropdownItemCls(variant)}
              onClick={closeMenu}
            >
              <div className="flex items-center space-x-2">
                <Ticket className="w-4 h-4" />
                <span>Event Management</span>
              </div>
            </Link>
          )}

          {effectiveRole !== ROLE.GUEST && (
            <Link
              href="/profile/applications"
              className={dropdownItemCls(variant)}
              onClick={closeMenu}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Applications</span>
              </div>
            </Link>
          )}

          {effectiveRole === ROLE.ADMIN && (
            <>
              <Link
                href="/admin/applications"
                className={dropdownItemCls(variant)}
                onClick={closeMenu}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Application Review</span>
                </div>
              </Link>

              <Link
                href="/admin/users"
                className={dropdownItemCls(variant)}
                onClick={closeMenu}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>User Management</span>
                </div>
              </Link>
            </>
          )}

          <hr className="my-1 border-gray-200" />

          <Button
            type="button"
            variant="ghost"
            onClick={onSignOut}
            className={`${dropdownItemCls(variant)} hover:text-black`}
          >
            <div className="flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
