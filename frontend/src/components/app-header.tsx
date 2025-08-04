"use client";

import * as React from "react";
import Link from "next/link";

import { APP_NAME } from "@/constants/app";
import ROLE from "@/schema/enums/role";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  User as UserIcon,
  LogOut,
  Settings,
  Bell,
  X,
  Menu,
  Users,
  FileText,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { HeaderProps } from "@/types/app-header/type";
import {
  dropdownItemCls,
  headerCls,
  linkCls,
  logoCls,
  primaryBtnCls,
  secondaryBtnCls,
  textCls,
} from "@/styles/app-header/style";
import AppHeaderNav from "./app-header/app-header-nav";
import UserMenu from "./app-header/user-menu";
import HeaderSkeleton from "./app-header/header-skeleton";
import NavigationLinks from "./navigation-links";
import { useAuthStatus, useUserProfile } from "@/hooks/user-store-hooks";
import { logout } from "@/services/auth.service";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function AppHeader({
  showTabs = true,
  customTabs,
  variant = "default",
  sticky = false,
  showSearch = false,
  notifications = 0,
}: HeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { isLoggedIn, isAuthLoading } = useAuthStatus();
  const userProfile = useUserProfile();

  // ----- derived user display fields -----
  const getDisplayName = () =>
    userProfile?.username ||
    (userProfile?.email ? userProfile.email.split("@")[0] : "User");

  const getAvatarSrc = () => userProfile?.photoUrl || "";

  const effectiveRole = userProfile?.role;

  // ----- handlers -----
  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      closeMenus();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Loading states                                                     */
  /* ------------------------------------------------------------------ */
  if (isAuthLoading) {
    return <HeaderSkeleton variant={variant} />;
  }

  /* ------------------------------------------------------------------ */
  /* Desktop Tabs                                                       */
  /* ------------------------------------------------------------------ */
  const desktopTabs = customTabs ? (
    customTabs
  ) : isLoggedIn ? (
    <>
      <NavigationLinks
        pathname={pathname}
        variant={variant}
        isLoggedIn={isLoggedIn}
        userRole={effectiveRole}
      />

      {/* Notifications */}
      {notifications > 0 && (
        <div className="relative">
          <Button
            type="button"
            className={`${linkCls(variant)} relative`}
            onClick={() => console.log("TODO: notifications panel")}
          >
            <Bell className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications > 9 ? "9+" : notifications}
            </span>
          </Button>
        </div>
      )}

      {/* User menu trigger */}
      <UserMenu
        variant={variant}
        onSignOut={handleSignOut}
        userProfile={userProfile}
      />
    </>
  ) : (
    <>
      <AppHeaderNav pathname={pathname} href="/events" variant={variant}>
        Events
      </AppHeaderNav>
      <div className="flex items-center space-x-3">
        <Link href="/auth?mode=signup" className={secondaryBtnCls(variant)}>
          Sign Up
        </Link>
        <Link href="/auth?mode=signin" className={primaryBtnCls(variant)}>
          Login
        </Link>
      </div>
    </>
  );

  /* ------------------------------------------------------------------ */
  /* Mobile Tabs                                                        */
  /* ------------------------------------------------------------------ */
  const mobileTabs = customTabs ? (
    <div className="flex flex-col space-y-3">{customTabs}</div>
  ) : isLoggedIn ? (
    <>
      <NavigationLinks
        pathname={pathname}
        variant={variant}
        isLoggedIn={isLoggedIn}
        userRole={effectiveRole}
        onLinkClick={closeMenus}
      />

      {effectiveRole === ROLE.EVENT_ORGANIZER && (
        <AppHeaderNav
          pathname={pathname}
          href="/profile/events/dashboard"
          variant={variant}
          onClick={closeMenus}
        >
          Event Management
        </AppHeaderNav>
      )}

      {/* Mobile user summary */}
      <div className="px-2 py-2 border-t border-gray-200/20">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10 border-2 border-gray-300">
            <AvatarImage src={getAvatarSrc()} alt="User Avatar" />
            <AvatarFallback>
              <UserIcon className="w-5 h-5 text-gray-600" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className={`font-medium ${textCls(variant)}`}>
              {getDisplayName()}
            </div>
            <div className="text-sm text-gray-500">{userProfile?.email}</div>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <Link
            href="/profile"
            className={`${dropdownItemCls(variant)} rounded-md`}
            onClick={closeMenus}
          >
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </div>
          </Link>

          {effectiveRole === ROLE.EVENT_ORGANIZER && (
            <Link
              href="/profile/events/dashboard"
              className={`${dropdownItemCls(variant)} rounded-md`}
              onClick={closeMenus}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Event Management</span>
              </div>
            </Link>
          )}

          {effectiveRole !== ROLE.GUEST && (
            <Link
              href="/profile/application"
              className={dropdownItemCls(variant)}
              onClick={closeMenus}
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
                className={`${dropdownItemCls(variant)} rounded-md`}
                onClick={closeMenus}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Application Review</span>
                </div>
              </Link>
              <Link
                href="/admin/users"
                className={`${dropdownItemCls(variant)} rounded-md`}
                onClick={closeMenus}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>User Management</span>
                </div>
              </Link>
            </>
          )}

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`${dropdownItemCls(variant)} rounded-md hover:text-black dark:hover:text-white`}
          >
            <div className="flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Mobile Notifications */}
      {notifications > 0 && (
        <div className="flex items-center justify-between px-2 pt-3 border-t border-gray-200/20">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span className={`text-sm ${textCls(variant)}`}>Notifications</span>
            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications > 9 ? "9+" : notifications}
            </span>
          </div>
        </div>
      )}
    </>
  ) : (
    <>
      <AppHeaderNav
        pathname={pathname}
        href="/events"
        variant={variant}
        onClick={closeMenus}
      >
        Events
      </AppHeaderNav>
      <div className="flex flex-col space-y-3 pt-3 border-t border-gray-200/20">
        <Link
          href="/auth?mode=signup"
          className={`${secondaryBtnCls(variant)} text-center`}
          onClick={closeMenus}
        >
          Sign Up
        </Link>
        <Link
          href="/auth?mode=signin"
          className={`${primaryBtnCls(variant)} text-center`}
          onClick={closeMenus}
        >
          Login
        </Link>
      </div>
    </>
  );

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <header className={headerCls(variant, sticky)}>
      <div className="mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className={logoCls(variant)}>
          {APP_NAME}
        </Link>

        {/* Search (desktop) */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 1 1 14 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Desktop nav */}
        {showTabs && (
          <nav className="hidden md:flex items-center space-x-6">
            {desktopTabs}
          </nav>
        )}

        {/* Mobile burger */}
        {showTabs && (
          <Button
            variant="ghost"
            type="button"
            className={`md:hidden ${textCls(
              variant
            )} p-2 rounded-md hover:bg-gray hover:text-black transition-colors`}
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        )}
      </div>

      {/* Mobile nav */}
      {showTabs && isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-200/20">
          <nav className="flex flex-col space-y-3 pt-4">
            {showSearch && (
              <div className="px-2 mb-4">
                <Input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            )}
            {mobileTabs}
          </nav>
        </div>
      )}

      {/* Backdrop to close user dropdown */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
}
