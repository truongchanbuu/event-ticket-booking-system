import { z } from "zod";

export const ATTENDEE_STATUS = {
    REGISTERED: "registered",
    CHECKED_IN: "checked_in",
    CANCELLED: "cancelled",
};

export const AttendeeSchema = z
    .object({
        attendeeID: z.string(),
        ticketTypeID: z.string({ message: "Invalid ticket type ID" }),
        eventID: z.string({ message: "Invalid event ID." }),
        quantity: z.number().min(1, "It must be at least 1.").default(1),
        // assignedEmail: z.email().optional(),

        displayName: z
            .string()
            .min(2, "Display name is too short.")
            .max(100, "Display name is too long."),

        email: z.string().email({ message: "Invalid Email." }),

        attendeeStatus: z.enum([
            ATTENDEE_STATUS.CHECKED_IN,
            ATTENDEE_STATUS.CANCELLED,
        ]),

        checkInTime: z.string().optional().nullable(),

        qrCodeUrl: z.string().url({ message: "Invalid QR Code." }).optional(),
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
        },
    );
