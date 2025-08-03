import { z } from "zod";
import { LocationSchema } from "./event.schema";

const START_DELAY_TIME = 1000 * 60 * 60;

export const CreateTicketTypeSchema = z.object({
  name: z.string().min(1, "Ticket type name cannot be empty."),
  price: z
    .number({ invalid_type_error: "It must be a number." })
    .min(0, "Price cannot be negative."),
  totalQuantity: z
    .number({ invalid_type_error: "It must be a number." })
    .int()
    .min(1, "The number of tickets must be at least 1."),
});

export const CreateEventFormSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 charaters.")
      .max(100, "Title must be less than 100 charaters."),
    description: z
      .string()
      .min(10, "Description must be at least 10 charaters."),
    images: z.any().refine((files) => files && files.length > 0, {
      message: "Bạn phải tải lên ít nhất một hình ảnh.",
    }),
    location: LocationSchema,
    categories: z
      .array(z.string())
      .min(1, "You must select at least 1 category."),
    startTime: z
      .string()
      .min(1, "It cannot be empty.")
      .refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: "Invalid Date.",
      })
      .transform((val) => new Date(val).toISOString())
      .refine(
        (val) => new Date(val).getTime() >= Date.now() + START_DELAY_TIME,
        {
          message: "Start time must be at least 1 hour from now.",
        }
      ),
    endTime: z
      .string()
      .min(1, "It cannot be empty.")
      .refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: "Invalid Date.",
      })
      .transform((val) => new Date(val).toISOString()),
    isFeatured: z.boolean().default(false),
    ticketTypes: z.array(CreateTicketTypeSchema).optional(),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export type CreateEventFormValues = z.infer<typeof CreateEventFormSchema>;
