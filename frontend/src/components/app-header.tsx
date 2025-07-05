"use client";
import { APP_NAME } from "@/constants/app";
import Link from "next/link";
import { useState } from "react";
import { User } from "lucide-react";

type HeaderProps = {
  showTabs?: boolean;
  customTabs?: React.ReactNode;
  variant?: "default" | "dark" | "gradient";
  sticky?: boolean;
  showSearch?: boolean;
  userAvatar?: string;
  username?: string;
  notifications?: number;
};

export default function Header({
  showTabs = true,
  customTabs,
  variant = "default",
  sticky = false,
  showSearch = false,
  userAvatar,
  username,
  notifications = 0,
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const getLinkStyles = () => {
    const base =
      "text-md font-medium transition-all duration-200 hover:scale-105";
    switch (variant) {
      case "dark":
        return `${base} text-gray-300 hover:text-white hover:shadow-lg`;
      case "gradient":
        return `${base} text-white/90 hover:text-white hover:shadow-lg`;
      default:
        return `${base} text-gray-600 hover:text-blue-600 hover:shadow-md`;
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
            ) : (
              <>
                <Link className={getLinkStyles()} href="/events">
                  Events
                </Link>
                <Link className={getLinkStyles()} href="/tickets">
                  My Tickets
                </Link>
                {/* Profile Section - Username + Avatar or Default */}
                <Link
                  className={`${getLinkStyles()} flex items-center space-x-2`}
                  href="/profile"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-blue-500 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                  <span className="max-w-24 truncate">
                    {username || "Profile"}
                  </span>
                </Link>
              </>
            )}

            {/* Notifications */}
            {notifications > 0 && (
              <div className="relative">
                <button className={`${getLinkStyles()} relative`}>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-5 5v-5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4"
                    />
                  </svg>
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                </button>
              </div>
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
            ) : (
              <>
                <Link className={`${getLinkStyles()} px-2 py-1`} href="/events">
                  Events
                </Link>
                <Link
                  className={`${getLinkStyles()} px-2 py-1`}
                  href="/tickets"
                >
                  My Tickets
                </Link>
                {/* Mobile Profile Section - Username + Avatar or Default */}
                <Link
                  className={`${getLinkStyles()} px-2 py-1 flex items-center space-x-2`}
                  href="/profile"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="User Avatar"
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-600" />
                    </div>
                  )}
                  <span>{username || "Profile"}</span>
                </Link>
              </>
            )}

            {/* Mobile User Section - Only show notifications if no username/avatar in nav */}
            {notifications > 0 && !(username || userAvatar) && (
              <div className="flex items-center justify-between px-2 pt-3 border-t border-gray-200/20 mt-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${getTextStyles()}`}>
                    Notifications
                  </span>
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
