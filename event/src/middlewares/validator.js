import { body, param } from "express-validator";
import {
    BaseValidator,
    CATEGORY_IDS,
} from "@event_ticket_booking_system/shared";

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
            // Organizer validation
            ...this.validateName({ fieldName: "organizerName" }),

            // Event details validation
            ...this.validateEventTitle({ required: true }),
            ...this.validateEventDesc({ required: true }),
            ...this.validateLocation({ required: true }),

            // Time validation
            ...this.validateStartTime({ required: true }),
            ...this.validateEndTime({ required: true }),

            // Optional arrays validation
            ...this.validateThumbnails(),

            ...this.validateCategory(),
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
            .withMessage("categories must be an array with 1 to 5 items")
            .custom((categories) => {
                categories.forEach((cat) => {
                    if (
                        typeof cat !== "string" ||
                        !CATEGORY_IDS.includes(cat)
                    ) {
                        throw new Error(
                            `Invalid category: ${cat}. Must be one of: ${CATEGORY_IDS.join(", ")}`,
                        );
                    }
                });

                return true;
            });

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
