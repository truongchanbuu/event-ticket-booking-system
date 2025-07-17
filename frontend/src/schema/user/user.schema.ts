import { z } from "zod";
import {
  ORGANIZER_STATUS,
  OrganizerStatusEnum,
  RoleEnum,
  USER_STATUS,
  UserStatusEnum,
} from "../enums";
import { User } from "firebase/auth";
import ROLE from "../enums/role";

// Schema
export const UserSchema = z.object({
  userID: z.string(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  phoneNumber: z.string().optional(),
  role: RoleEnum,
  photoUrl: z.string().url().optional(),
  followedOrganizers: z.array(z.string()).optional(),
  preferenceCategories: z.array(z.string()).optional(),
  notificationReferences: z.array(z.string()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),
  status: UserStatusEnum,
  organizerStatus: OrganizerStatusEnum,
  reportCount: z.number().min(0).default(0),
  riskScore: z.number().min(0).max(1).default(0),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  provider: z.string().optional(),
});

export type AppUser = z.infer<typeof UserSchema>;

export function fromFirebaseUser(firebaseUser: User): Partial<AppUser> {
  const {
    uid,
    email,
    displayName,
    phoneNumber,
    photoURL,
    emailVerified,
    providerId,
  } = firebaseUser;

  return {
    userID: uid,
    email: email,
    username: displayName ?? email?.split("@")[0] ?? "Anonymous",
    phoneNumber: phoneNumber,
    photoUrl: photoURL,
    emailVerified: emailVerified ?? false,
    phoneVerified: false,

    role: ROLE.CUSTOMER,
    status: USER_STATUS.ACTIVE,
    organizerStatus: ORGANIZER_STATUS.NONE,

    followedOrganizers: [],
    preferenceCategories: [],
    notificationReferences: [],
    reportCount: 0,
    riskScore: 0,

    createdAt: new Date(),
    updatedAt: null,
    provider: providerId,
  };
}
