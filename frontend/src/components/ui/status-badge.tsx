"use client";

import * as React from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  HelpCircle,
  TicketPercentIcon,
  type LucideIcon,
  UserX,
  UserCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge as UiBadge } from "@/components/ui/badge";
import ROLE from "@/schema/enums/role";

export const BADGE_CONFIGS = {
  role: {
    [ROLE.ADMIN]: "bg-rose-100 text-rose-800 border-rose-300",
    [ROLE.EVENT_ORGANIZER]: "bg-indigo-100 text-indigo-800 border-indigo-300",
    [ROLE.CUSTOMER]: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  status: {
    active: "bg-green-100 text-green-800 border-green-200",
    inactive: "bg-yellow-100 text-yellow-800 border-yellow-200",
    suspended: "bg-red-100 text-red-800 border-red-200",
  },
  organizerStatus: {
    verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-orange-100 text-orange-800 border-orange-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  },
  default: "bg-gray-100 text-gray-800 border-gray-200",
} as const;

type BadgeConfigMap = typeof BADGE_CONFIGS;
export type BadgeType = Exclude<keyof BadgeConfigMap, "default">; // role | status | organizerStatus

/* ------------------------------------------------------------------
 * Icon mappings by semantic badge type/value.
 * NOTE: Icons are returned as *components* (not JSX elements) so the
 *       consumer can apply size/color via className.
 * ------------------------------------------------------------------ */
const STATUS_ICON_MAP = {
  status: {
    active: CheckCircle,
    inactive: AlertTriangle,
    suspended: XCircle,
  },
  organizerStatus: {
    verified: CheckCircle,
    pending: Clock,
    rejected: XCircle,
    permanently_rejected: UserX,
  },
  role: {
    [ROLE.ADMIN]: Shield,
    [ROLE.EVENT_ORGANIZER]: TicketPercentIcon,
    [ROLE.CUSTOMER]: UserCircle,
  },
  default: HelpCircle,
} as const;

type IconMap = typeof STATUS_ICON_MAP;

/** Return Tailwind class string for a given type+value pair. */
export function getBadgeClass<T extends keyof BadgeConfigMap>(
  type: T,
  value: string | number | null | undefined
): string {
  const v = String(value ?? "").toLowerCase();
  return (
    (BADGE_CONFIGS[type]?.[v] as string | undefined) ?? BADGE_CONFIGS.default
  );
}

/** Return Lucide icon component for a given type+value pair. */
export function getStatusIcon<T extends keyof IconMap>(
  type: T,
  value: string | number | null | undefined
): LucideIcon | null {
  const v = String(value ?? "").toLowerCase();
  const Icon = STATUS_ICON_MAP[type]?.[v] as LucideIcon | undefined;
  if (Icon) return Icon;
  return STATUS_ICON_MAP.default ?? null;
}

/* ------------------------------------------------------------------
 * Helper: humanize text ("not_verified" -> "Not verified")
 * ------------------------------------------------------------------ */
function humanize(value: string | number | null | undefined): string {
  if (value == null) return "Unknown";
  const s = String(value).replace(/[_-]+/g, " ").trim();
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface StatusBadgeProps
  extends Omit<React.ComponentProps<typeof UiBadge>, "children"> {
  type: BadgeType;
  value: string | number | null | undefined;
  label?: React.ReactNode;
  showIcon?: boolean;
  iconClassName?: string;
  /** Force a particular icon component (overrides lookup). */
  iconOverride?: LucideIcon | null;
  /** Force label to show even on mobile (disables auto responsive) */
  alwaysShowLabel?: boolean;
  /** Breakpoint for responsive behavior */
  mobileBreakpoint?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  value,
  label,
  showIcon = true,
  iconClassName,
  iconOverride,
  variant = "outline",
  className,
  alwaysShowLabel = false,
  mobileBreakpoint = "sm",
  ...rest
}) => {
  const Icon = iconOverride ?? getStatusIcon(type as any, value);
  const resolvedLabel = label ?? humanize(value);
  const colorClasses = getBadgeClass(type as any, value);

  // Auto responsive behavior - always enabled unless alwaysShowLabel is true
  const isResponsive = !alwaysShowLabel;

  // Responsive classes based on breakpoint
  const getResponsiveClasses = () => {
    if (!isResponsive) return null;

    const breakpointMap = {
      sm: "sm:",
      md: "md:",
      lg: "lg:",
    };

    const bp = breakpointMap[mobileBreakpoint];
    return {
      // Base classes for mobile (icon-only)
      mobile: showIcon && Icon ? "px-1.5" : "",
      // Classes for larger screens (icon + text)
      desktop: `${bp}px-2 ${bp}gap-1`,
    };
  };

  const responsiveClasses = getResponsiveClasses();

  return (
    <UiBadge
      variant={variant}
      className={cn(
        "leading-none transition-all duration-200",
        // Auto responsive layout
        isResponsive ? "gap-2" : "gap-3",
        isResponsive && responsiveClasses?.mobile,
        isResponsive && responsiveClasses?.desktop,
        colorClasses,
        className
      )}
      title={isResponsive ? String(resolvedLabel) : undefined} // Tooltip for mobile
      {...rest}
    >
      {showIcon && Icon ? (
        <Icon
          className={cn(
            "shrink-0",
            isResponsive ? "w-3.5 h-3.5" : "w-3 h-3", // Slightly larger for icon-only
            iconClassName
          )}
        />
      ) : null}

      {/* Auto responsive text - hidden on mobile by default */}
      <span
        className={cn(
          isResponsive && `hidden ${mobileBreakpoint}:inline`,
          "truncate"
        )}
      >
        {resolvedLabel}
      </span>
    </UiBadge>
  );
};

/* ------------------------------------------------------------------
 * Convenience components with auto-responsive defaults
 * ------------------------------------------------------------------ */
export const RoleBadge = (props: Omit<StatusBadgeProps, "type">) => (
  <StatusBadge type="role" {...props} />
);

export const AccountStatusBadge = (props: Omit<StatusBadgeProps, "type">) => (
  <StatusBadge type="status" {...props} />
);

export const OrganizerStatusBadge = (props: Omit<StatusBadgeProps, "type">) => (
  <StatusBadge type="organizerStatus" {...props} />
);

/* ------------------------------------------------------------------
 * Specialized variants
 * ------------------------------------------------------------------ */
export const CompactStatusBadge: React.FC<StatusBadgeProps> = (props) => (
  <StatusBadge {...props} mobileBreakpoint="md" />
);

export const IconOnlyStatusBadge: React.FC<StatusBadgeProps> = ({
  className,
  label,
  value,
  ...props
}) => {
  const resolvedLabel = label ?? humanize(value);

  return (
    <StatusBadge
      {...props}
      value={value}
      alwaysShowLabel={false}
      className={cn("px-1.5 gap-0", className)}
      showIcon={true}
      aria-label={String(resolvedLabel)}
    />
  );
};
