import { z } from "zod";
enum ROLE {
  GUEST = "guest",
  CUSTOMER = "customer",
  EVENT_ORGANIZER = "event_organizer",
  ADMIN = "admin",
}

export const RoleEnum = z.nativeEnum(ROLE);
export type Role = z.infer<typeof RoleEnum>;
export default ROLE;
