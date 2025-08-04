import { body, param } from "express-validator";
import {
    BaseValidator,
    CATEGORY_IDS,
} from "@event_ticket_booking_system/shared";
import { EVENT_STATUS } from "../enums/event-status.js";

const LIMIT_IMAGE_COUNT = 10;
const LIMIT_TICKET_COUNT = 20;
const MAX_PRICE = 100000000;
const MAX_REMAINING = 10000;
export default class EventValidator extends BaseValidator {
    static validateGetMyEvent() {
        return [...this.validateIDParam({ paramName: "eventID" })];
    }

    static createEventValidation() {
        return [
            body("title")
                .isString()
                .isLength({ min: 3, max: 100 })
                .withMessage(
                    "Title must be at least 3 and cannot more than 100 charaters",
                ),

            body("description")
                .isString()
                .notEmpty()
                .withMessage("Description cannot be empty."),

            body("images")
                .isArray({ min: 1 })
                .withMessage("At least one image is required.")
                .bail() // Dừng lại nếu không phải là array
                .custom((images) => {
                    for (const image of images) {
                        if (typeof image !== "string" || !image.trim()) {
                            throw new Error("Image URL cannot be empty.");
                        }
                    }
                    return true;
                }),
            body("images.*") // Validate từng phần tử trong array
                .isURL()
                .withMessage("Image must be a valid url."),

            body("categories")
                .isArray({ min: 1 })
                .withMessage("There should be at least 1 category."),
            body("categories.*")
                .isString()
                .notEmpty()
                .withMessage("Category name cannot be empty."),

            // --- Time ---
            body("startTime")
                .isISO8601()
                .withMessage("Invalid Date for startTime.")
                .toDate(),

            body("endTime")
                .isISO8601()
                .withMessage("Invalid Date for endTime.")
                .toDate() // Chuyển đổi thành đối tượng Date
                // refine: endTime > startTime
                .custom((endTime, { req }) => {
                    if (endTime <= req.body.startTime) {
                        throw new Error("End time must be after start time");
                    }
                    return true;
                }),

            // --- Location ---
            body("location.address")
                .isString()
                .notEmpty()
                .withMessage("Location address cannot be empty."),

            body("location.coordinates.latitude")
                .optional()
                .isFloat({ min: -90, max: 90 })
                .withMessage("Latitude must be between -90 and 90."),
            body("location.coordinates.longitude")
                .optional()
                .isFloat({ min: -180, max: 180 })
                .withMessage("Longitude must be between -180 and 180."),

            // --- Other Fields ---
            body("status")
                .optional()
                .isIn(Object.values(EVENT_STATUS))
                .withMessage(
                    `Invalid status. Must be one of: ${Object.values(EVENT_STATUS).join(", ")}`,
                ),

            body("isFeatured")
                .optional()
                .isBoolean()
                .withMessage("isFeatured must be a boolean."),
        ];
    }

    static validateUpdateMyEvent() {
        return [
            ...this.validateIDParam({ paramName: "eventID" }),
            ...this.validateEventTitle(),
            ...this.validateEventDesc(),
            ...this.validateLocation(),
            ...this.validateCategory(),
            ...this.validateStartTime(),
            ...this.validateEndTime(),
            ...this.validateThumbnails(),
        ];
    }

    static validateCancelEvent() {
        return [
            param("eventID")
                .notEmpty()
                .withMessage("eventId is required")
                .isString()
                .withMessage("eventId must be a string"),

            body("cancelledReason")
                .optional()
                .isString()
                .withMessage("cancelledReason must be a string")
                .isLength({ max: 300 })
                .withMessage("cancelledReason is too long"),
        ];
    }

    // Shared validation
    static validateEventTitle({ required = false } = {}) {
        const chain = body("eventTitle")
            .isString()
            .trim()
            .isLength({ min: 3, max: 200 })
            .withMessage("Event title must be between 3-200 characters");

        return required
            ? [
                  body("eventTitle")
                      .notEmpty()
                      .withMessage("Event title is required"),
                  chain,
              ]
            : [chain.optional()];
    }

    // Validate event description
    static validateEventDesc({ required = false } = {}) {
        const chain = body("eventDesc")
            .isString()
            .trim()
            .isLength({ min: 10, max: 2000 })
            .withMessage(
                "Event description must be between 10-2000 characters",
            );

        return required
            ? [
                  body("eventDesc")
                      .notEmpty()
                      .withMessage("Event description is required"),
                  chain,
              ]
            : [chain.optional()];
    }

    // Validate thumbnails array
    static validateThumbnails({ required = false } = {}) {
        const validations = [
            body("thumbnails")
                .optional()
                .isArray({ min: 0, max: 10 })
                .withMessage(
                    "Thumbnails must be an array with maximum 10 items",
                ),

            body("thumbnails.*")
                .optional()
                .isString()
                .trim()
                .isURL()
                .withMessage("Each thumbnail must be a valid URL"),
        ];

        if (required) {
            validations.unshift(
                body("thumbnails")
                    .notEmpty()
                    .withMessage("Thumbnails are required"),
            );
        }

        return validations;
    }

    static validateLocation({ required = false } = {}) {
        const chain = body("location")
            .isString()
            .trim()
            .isLength({ min: 5, max: 500 })
            .withMessage("Location must be between 5-500 characters");

        return required
            ? [
                  body("location")
                      .notEmpty()
                      .withMessage("Location is required"),
                  chain,
              ]
            : [chain.optional()];
    }

    static validateStartTime({ required = false } = {}) {
        const chain = body("startTime")
            .isISO8601()
            .withMessage("Start time must be a valid ISO 8601 date")
            .custom((value) => {
                const startTime = new Date(value);
                const now = new Date();

                if (startTime <= now) {
                    throw new Error("Start time must be in the future");
                }
                return true;
            });

        return required
            ? [
                  body("startTime")
                      .notEmpty()
                      .withMessage("Start time is required"),
                  chain,
              ]
            : [chain.optional()];
    }

    static validateEndTime({ required = false } = {}) {
        const chain = body("endTime")
            .isISO8601()
            .withMessage("End time must be a valid ISO 8601 date")
            .custom((value, { req }) => {
                const endTime = new Date(value);
                const startTime = req.body.startTime
                    ? new Date(req.body.startTime)
                    : null;

                if (startTime && endTime <= startTime) {
                    throw new Error("End time must be after start time");
                }

                const now = new Date();
                if (endTime <= now) {
                    throw new Error("End time must be in the future");
                }

                return true;
            });

        return required
            ? [
                  body("endTime")
                      .notEmpty()
                      .withMessage("End time is required"),
                  chain,
              ]
            : [chain.optional()];
    }

    static validateCategory({ required = false } = {}) {
        const chain = body("categories")
            .optional()
            .isArray({ min: 1, max: 5 })
            .withMessage("categories must be an array with 1 to 5 items");

        return required
            ? [
                  body("category")
                      .notEmpty()
                      .withMessage("Category is required"),
                  chain,
              ]
            : [chain.optional()];
    }
}
