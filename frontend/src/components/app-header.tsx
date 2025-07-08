"use client";
import { APP_NAME } from "@/constants/app";
import Link from "next/link";
import { useState } from "react";
import { User, LogOut, Settings, Bell, Ticket } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";

type HeaderProps = {
  showTabs?: boolean;
  customTabs?: React.ReactNode;
  variant?: "default" | "dark" | "gradient";
  sticky?: boolean;
  showSearch?: boolean;
  notifications?: number;
};

export default function Header({
  showTabs = true,
  customTabs,
  variant = "default",
  sticky = false,
  showSearch = false,
  notifications = 0,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { userProfile } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "";
    return user.displayName || user.email?.split("@")[0] || "User";
  };

  const getUserAvatar = () => {
    if (!user) return null;
    return user.photoURL;
  };

  const getHeaderStyles = () => {
    const baseStyles =
      "border-b px-4 sm:px-6 lg:px-10 py-4 mb-5 transition-all duration-200 print:hidden";
    const stickyStyles = sticky ? "sticky top-0 z-50 backdrop-blur-sm" : "";

    switch (variant) {
      case "dark":
        return `${baseStyles} ${stickyStyles} bg-gray-900 border-gray-700 shadow-lg`;
      case "gradient":
        return `${baseStyles} ${stickyStyles} bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 border-transparent shadow-xl`;
      default:
        return `${baseStyles} ${stickyStyles} bg-white/95 border-gray-200 shadow-sm`;
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case "dark":
        return "text-white";
      case "gradient":
        return "text-white";
      default:
        return "text-gray-900";
    }
  };

  const getLinkStyles = (isActive = false) => {
    const base =
      "text-md font-medium transition-all duration-200 hover:scale-105";

    if (isActive) {
      switch (variant) {
        case "dark":
          return `${base} text-white font-semibold border-b-2 border-blue-400`;
        case "gradient":
          return `${base} text-white font-semibold border-b-2 border-yellow-300`;
        default:
          return `${base} text-blue-600 font-semibold border-b-2 border-blue-600`;
      }
    }

    switch (variant) {
      case "dark":
        return `${base} text-gray-300 hover:text-white hover:shadow-lg`;
      case "gradient":
        return `${base} text-white/90 hover:text-white hover:shadow-lg`;
      default:
        return `${base} text-gray-600 hover:text-blue-600 hover:shadow-md`;
    }
  };

  const getButtonStyles = () => {
    const base =
      "px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105";
    switch (variant) {
      case "dark":
        return `${base} bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg`;
      case "gradient":
        return `${base} bg-white/20 text-white border border-white/30 hover:bg-white/30 hover:shadow-lg backdrop-blur-sm`;
      default:
        return `${base} bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md`;
    }
  };

  const getSecondaryButtonStyles = () => {
    const base =
      "px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 border";
    switch (variant) {
      case "dark":
        return `${base} border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500`;
      case "gradient":
        return `${base} border-white/30 text-white hover:bg-white/20 hover:shadow-lg backdrop-blur-sm`;
      default:
        return `${base} border-blue-600 text-blue-600 hover:bg-blue-50 hover:shadow-md`;
    }
  };

  const getLogoStyles = () => {
    const base =
      "text-xl sm:text-xl font-bold transition-all duration-300 hover:scale-105";
    switch (variant) {
      case "dark":
        return `${base} text-blue-400 hover:text-blue-300`;
      case "gradient":
        return `${base} text-white hover:text-yellow-200 drop-shadow-lg`;
      default:
        return `${base} text-blue-600 hover:text-blue-700`;
    }
  };

  const getDropdownStyles = () => {
    const base = "absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50";
    switch (variant) {
      case "dark":
        return `${base} bg-gray-800 border border-gray-700`;
      case "gradient":
        return `${base} bg-white/95 backdrop-blur-sm border border-white/20`;
      default:
        return `${base} bg-white border border-gray-200`;
    }
  };

  const getDropdownItemStyles = () => {
    const base = "block px-4 py-2 text-sm transition-colors duration-200";
    switch (variant) {
      case "dark":
        return `${base} text-gray-300 hover:bg-gray-700 hover:text-white`;
      case "gradient":
        return `${base} text-gray-700 hover:bg-gray-100`;
      default:
        return `${base} text-gray-700 hover:bg-gray-100`;
    }
  };

  // Show loading skeleton if auth is still loading
  if (loading) {
    return (
      <header className={getHeaderStyles()}>
        <div className="mx-auto flex justify-between items-center">
          <div className={getLogoStyles()}>{APP_NAME}</div>
          <div className="hidden md:flex items-center space-x-6">
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={getHeaderStyles()}>
      <div className="mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className={getLogoStyles()}>
          {APP_NAME}
        </Link>

        {/* Search Bar */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Navigation */}
        {showTabs && (
          <nav className="hidden md:flex items-center space-x-6">
            {customTabs ? (
              customTabs
            ) : user ? (
              <>
                <Link
                  className={getLinkStyles(pathname === "/events")}
                  href="/events"
                >
                  Events
                </Link>
                <Link
                  className={getLinkStyles(pathname === "/profile/my-events")}
                  href="/profile/my-events"
                >
                  My Tickets
                </Link>
                <Link
                  className={getLinkStyles(pathname === "/payment/history")}
                  href="/payment/history"
                >
                  Payment History
                </Link>
                {userProfile?.role === "organizer" && (
                  <Link
                    className={getLinkStyles(pathname === "/profile/my-events")}
                    href="/profile/my-events"
                  >
                    My Events
                  </Link>
                )}

                {/* Notifications */}
                {notifications > 0 && (
                  <div className="relative">
                    <button className={`${getLinkStyles()} relative`}>
                      <Bell className="w-6 h-6" />
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications > 9 ? "9+" : notifications}
                      </span>
                    </button>
                  </div>
                )}

                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`${getLinkStyles()} flex items-center space-x-2`}
                  >
                    {getUserAvatar() ? (
                      <img
                        src={getUserAvatar()!}
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-blue-500 transition-colors"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <span className="max-w-24 truncate">
                      {getUserDisplayName()}
                    </span>
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className={getDropdownStyles()}>
                      <Link
                        href="/profile"
                        className={getDropdownItemStyles()}
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </div>
                      </Link>
                      <Link
                        href="/profile/my-events"
                        className={getDropdownItemStyles()}
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <Ticket className="w-4 h-4" />
                          <span>My Events</span>
                        </div>
                      </Link>
                      <hr className="my-1 border-gray-200" />
                      <button
                        onClick={handleSignOut}
                        className={`${getDropdownItemStyles()} w-full text-left`}
                      >
                        <div className="flex items-center space-x-2">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  className={getLinkStyles(pathname === "/events")}
                  href="/events"
                >
                  Events
                </Link>
                <div className="flex items-center space-x-3">
                  <Link
                    href="/auth?mode=signup"
                    className={getSecondaryButtonStyles()}
                  >
                    Sign Up
                  </Link>
                  <Link href="/auth?mode=signin" className={getButtonStyles()}>
                    Login
                  </Link>
                </div>
              </>
            )}
          </nav>
        )}

        {/* Mobile Menu Button */}
        {showTabs && (
          <button
            className={`md:hidden ${getTextStyles()} p-2 rounded-md hover:bg-gray-100/10 transition-colors`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {showTabs && isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-200/20">
          <nav className="flex flex-col space-y-3 pt-4">
            {showSearch && (
              <div className="px-2 mb-4">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            )}

            {customTabs ? (
              <div className="flex flex-col space-y-3">{customTabs}</div>
            ) : user ? (
              <>
                <Link
                  className={`${getLinkStyles(pathname === "/events")} px-2 py-1`}
                  href="/events"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Events
                </Link>
                <Link
                  className={`${getLinkStyles(pathname === "/profile/my-events")} px-2 py-1`}
                  href="/profile/my-events"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Tickets
                </Link>
                <Link
                  className={`${getLinkStyles(pathname === "/payment/history")} px-2 py-1`}
                  href="/payment/history"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Payment History
                </Link>
                {userProfile?.role === "organizer" && (
                  <Link
                    className={`${getLinkStyles(pathname === "/profile/my-events")} px-2 py-1`}
                    href="/profile/my-events"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Events
                  </Link>
                )}

                {/* Mobile User Profile Section */}
                <div className="px-2 py-2 border-t border-gray-200/20">
                  <div className="flex items-center space-x-3 mb-3">
                    {getUserAvatar() ? (
                      <img
                        src={getUserAvatar()!}
                        alt="User Avatar"
                        className="w-10 h-10 rounded-full border-2 border-gray-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <div className={`font-medium ${getTextStyles()}`}>
                        {getUserDisplayName()}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Link
                      href="/profile"
                      className={`${getDropdownItemStyles()} rounded-md`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </div>
                    </Link>
                    <Link
                      href="/profile/events"
                      className={`${getDropdownItemStyles()} rounded-md`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>My Events</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className={`${getDropdownItemStyles()} rounded-md w-full text-left`}
                    >
                      <div className="flex items-center space-x-2">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mobile Notifications */}
                {notifications > 0 && (
                  <div className="flex items-center justify-between px-2 pt-3 border-t border-gray-200/20">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4" />
                      <span className={`text-sm ${getTextStyles()}`}>
                        Notifications
                      </span>
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications > 9 ? "9+" : notifications}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Link
                  className={`${getLinkStyles(pathname === "/events")} px-2 py-1`}
                  href="/events"
                >
                  Events
                </Link>
                <div className="flex flex-col space-y-3 pt-3 border-t border-gray-200/20">
                  <Link
                    href="/auth?mode=signup"
                    className={`${getSecondaryButtonStyles()} text-center`}
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/auth?mode=signin"
                    className={`${getButtonStyles()} text-center`}
                  >
                    Login
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
}
