import { z } from "zod";
import { ATTENDEE_STATUS, AttendeeStatusEnum } from "../enums/attendee-status";

export const AttendeeSchema = z
  .object({
    attendeeID: z.string(),
    purchaseID: z.string({ message: "Invalid purchase ID." }),
    ticketTypeID: z.string({ message: "Invalid ticket type ID" }),
    eventID: z.string({ message: "Invalid event ID." }),

    // assignedEmail: z.string().email().optional(),

    displayName: z
      .string()
      .min(2, "Display name is too short.")
      .max(100, "Display name is too long."),

    email: z.string().email({ message: "Invalid Email." }),

    attendeeStatus: AttendeeStatusEnum,

    checkInTime: z.string().optional().nullable(),

    qrCodeUrl: z.string().url({ message: "Invalid QR Code." }).optional(),

    joinedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.attendeeStatus === ATTENDEE_STATUS.CHECKED_IN) {
        return data.checkInTime != null;
      }

      return true;
    },
    {
      message: "Check-in time is required for checked-in status",
      path: ["checkInTime"],
    }
  );

export type Attendee = z.infer<typeof AttendeeSchema>;
