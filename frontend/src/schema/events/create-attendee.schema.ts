import { z } from "zod";
import { AttendeeStatusEnum, ATTENDEE_STATUS } from "../enums/attendee-status";

export const CreateAttendeeSchema = z
  .object({
    ticketTypeID: z.string().nonempty({ message: "Invalid ticket type ID" }),
    eventID: z.string({ message: "Invalid event ID." }),
    quantity: z.number().min(1, "It must be at least 1.").default(1),
    // assignedEmail: z.string().email().optional(),
    displayName: z
      .string()
      .min(2, "Display name is too short.")
      .max(100, "Display name is too long."),
    email: z.string().email({ message: "Invalid Email." }),
    attendeeStatus: AttendeeStatusEnum.default(ATTENDEE_STATUS.REGISTERED),
    checkInTime: z.string().optional().nullable(),
    manually: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      if (data.attendeeStatus === ATTENDEE_STATUS.CHECKED_IN) {
        return data.checkInTime != null;
      }
      return true;
    },
    {
      message: "Check-in time is required for checked-in status.",
      path: ["checkInTime"],
    }
  );

export type CreateAttendeeInput = z.infer<typeof CreateAttendeeSchema>;
