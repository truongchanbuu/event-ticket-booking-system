import { linkCls } from "@/styles/app-header/style";
import { HeaderVariant } from "@/types/app-header/type";
import Link from "next/link";

const isActivePath = (pathname: string, target: string) =>
  pathname === target || pathname.startsWith(target + "/");

interface NavLinkProps {
  pathname: string;
  href: string;
  variant: HeaderVariant;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function AppHeaderNav({
  pathname,
  href,
  variant,
  children,
  onClick,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={linkCls(variant, isActivePath(pathname, href))}
    >
      {children}
    </Link>
  );
}
