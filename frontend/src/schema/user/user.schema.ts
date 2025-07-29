import { z } from "zod";
import {
  RoleEnum,
  USER_STATUS,
  UserStatusEnum,
  ORGANIZER_STATUS,
  OrganizerStatusEnum,
} from "../enums";
import ROLE from "../enums/role";
import type { User as FirebaseUser } from "firebase/auth";
import { CategorySchema } from "../events/category.schema"; // Import CategorySchema vào đây

// =================================================================
// 1. ĐỊNH NGHĨA CÁC PHẦN RIÊNG LẺ CỦA SCHEMA
// =================================================================

// ----------------------------------------------------
// Phần I: Các trường cơ bản có ở MỌI user
// ----------------------------------------------------
export const BaseUserSchema = z.object({
  userID: z.string(),
  email: z.string().email(),
  username: z.string().min(3).max(30),

  phoneNumber: z.string().optional(),
  birthday: z.string().datetime({ offset: true }).optional(), // ISO string

  role: RoleEnum,

  photoUrl: z.string().url().optional(),

  followedOrganizers: z.array(z.string()).default([]).optional(),
  preferenceCategories: z.array(z.string()).default([]).optional(),
  notificationReferences: z.array(z.string()).default([]).optional(),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),

  status: UserStatusEnum,
  reportCount: z.number().min(0).default(0),
  riskScore: z.number().min(0).max(1).default(0),

  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  provider: z.string().optional(),
});

// ----------------------------------------------------
// Phần II: Các trường CHỈ có ở Organizer
// ----------------------------------------------------
export const OrganizerTypeSchema = z.enum(["personal", "business"]);

export const OrganizerPartSchema = z.object({
  organizerType: OrganizerTypeSchema,
  bio: z.string().optional(),

  website: z.string().url().optional(),
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  x: z.string().url().optional(),

  organizerStatus: OrganizerStatusEnum,
  followersCount: z.number().default(0),
  eventsCount: z.number().default(0),
  categories: z.array(CategorySchema).default([]),
});

// =================================================================
// 2. TẠO SCHEMA "FAT" DUY NHẤT VÀ TINH CHỈNH LOGIC
// =================================================================

// ----------------------------------------------------
// Hợp nhất Base và Organizer parts.
// Dùng `.partial()` trên OrganizerPartSchema để Zod hiểu rằng
// tất cả các trường của organizer đều có thể không tồn tại (optional),
// điều này đúng với user là Customer hoặc Admin.
// ----------------------------------------------------
const CombinedUserSchema = BaseUserSchema.merge(OrganizerPartSchema.partial());

// ----------------------------------------------------
// QUAN TRỌNG: Thêm logic xác thực dựa trên vai trò.
// Schema ở trên cho phép mọi trường tồn tại, nhưng chúng ta cần
// các quy tắc chặt chẽ hơn: "NẾU role là ORGANIZER, thì các trường X, Y phải tồn tại."
// ----------------------------------------------------
export const AppUserSchema = CombinedUserSchema.superRefine((data, ctx) => {
  // Quy tắc 1: Nếu là Organizer...
  if (data.role === ROLE.EVENT_ORGANIZER) {
    const result = OrganizerPartSchema.required({
      organizerStatus: true,
      organizerType: true,
    }).safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => ctx.addIssue(issue));
    }
  }

  // Quy tắc 2 (tùy chọn nhưng nên có): Nếu là Customer...
  if (data.role === ROLE.CUSTOMER) {
    if (data.organizerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["organizerType"],
        message: "Customer cannot have an organizerType.",
      });
    }
  }
  // Thêm các quy tắc cho Admin nếu cần
});

// =================================================================
// 3. CÁC KIỂU SUY DIỄN VÀ HÀM HELPER
// =================================================================

// ----------------------------------------------------
// Kiểu AppUser cuối cùng được suy ra từ schema đã được tinh chỉnh
// ----------------------------------------------------
export type AppUser = z.infer<typeof AppUserSchema>;

// Các type guard vẫn giữ nguyên giá trị, giúp kiểm tra vai trò trong code
// và giúp TypeScript thu hẹp kiểu dữ liệu một cách thông minh.
type OrganizerData = z.infer<typeof OrganizerPartSchema>;

export function isOrganizer(user: AppUser): user is AppUser & OrganizerData {
  return user.role === ROLE.EVENT_ORGANIZER;
}

export function isCustomer(user: AppUser): user is AppUser {
  return user.role === ROLE.CUSTOMER;
}

export function isAdmin(user: AppUser): user is AppUser {
  return user.role === ROLE.ADMIN;
}

// ----------------------------------------------------
// Cập nhật hàm fromFirebaseUser để trả về Partial<AppUser>
// và thêm các giá trị mặc định cho các trường của organizer.
// ----------------------------------------------------
export function fromFirebaseUser(firebaseUser: FirebaseUser): Partial<AppUser> {
  const {
    uid,
    email,
    displayName,
    phoneNumber,
    photoURL,
    emailVerified,
    providerId,
    metadata,
  } = firebaseUser;

  return {
    userID: uid,
    email: email ?? "",
    username: displayName ?? email?.split("@")[0] ?? "Anonymous",
    phoneNumber: phoneNumber ?? undefined,
    photoUrl: photoURL ?? undefined,
    emailVerified: emailVerified ?? false,
    provider: providerId,

    // Defaults
    phoneVerified: false,
    status: USER_STATUS.ACTIVE,

    // Cung cấp giá trị mặc định cho các trường từ các schema đã merge
    followedOrganizers: [],
    preferenceCategories: [],
    notificationReferences: [],
    reportCount: 0,
    riskScore: 0,

    // Mặc định cho các trường của Organizer
    followersCount: 0,
    eventsCount: 0,
  };
}
