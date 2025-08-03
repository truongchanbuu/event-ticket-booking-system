import ROLE from "@/schema/enums/role";

export interface NavItem {
  href: string;
  label: string;
  auth: boolean;
  roles?: ROLE[];
}

export const navItems: NavItem[] = [
  { href: "/events", label: "Events", auth: false },
  { href: "/profile/events", label: "My Events & Tickets", auth: true },
  { href: "/payment/history", label: "Payment History", auth: true },
  {
    href: "/profile/events/dashboard",
    label: "Event Management",
    auth: true,
    roles: [ROLE.EVENT_ORGANIZER],
  },
];
