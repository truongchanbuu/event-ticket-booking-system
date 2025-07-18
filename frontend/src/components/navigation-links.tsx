import ROLE from "@/schema/enums/role";
import AppHeaderNav from "./app-header/app-header-nav";
import { navItems } from "./nav-items";

interface NavigationLinksProps {
  pathname: string;
  variant: "default" | "dark" | "gradient";
  isLoggedIn: boolean;
  userRole?: ROLE;
  onLinkClick?: () => void; // Dùng cho mobile để đóng menu
}

export default function NavigationLinks({
  pathname,
  variant,
  isLoggedIn,
  userRole,
  onLinkClick,
}: NavigationLinksProps) {
  const filteredNavItems = navItems.filter((item) => {
    if (item.auth && !isLoggedIn) return false;
    if (item.roles && !item.roles.includes(userRole!)) return false;
    return true;
  });

  return (
    <>
      {filteredNavItems.map((item) => (
        <AppHeaderNav
          key={item.href}
          pathname={pathname}
          href={item.href}
          variant={variant}
          onClick={onLinkClick}
        >
          {item.label}
        </AppHeaderNav>
      ))}
    </>
  );
}
