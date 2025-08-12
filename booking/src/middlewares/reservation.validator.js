import { checkSchema } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";
import { config } from "../config/index.js";

export class ReservationValidator extends BaseValidator {
    static validateReservation = [
        checkSchema({
            // Header: Idempotency-Key
            "Idempotency-Key": {
                in: ["headers"],
                exists: { errorMessage: "IDEMPOTENCY_KEY_REQUIRED" },
                trim: true,
                notEmpty: { errorMessage: "IDEMPOTENCY_KEY_REQUIRED" },
            },
            // Body: eventId
            eventId: {
                in: ["body"],
                exists: { errorMessage: "EVENT_ID_REQUIRED" },
                isString: { errorMessage: "EVENT_ID_MUST_BE_STRING" },
                trim: true,
                notEmpty: { errorMessage: "EVENT_ID_REQUIRED" },
            },
            // Body: lines
            lines: {
                in: ["body"],
                isArray: {
                    options: { min: 1 },
                    errorMessage: "INVALID_LINES",
                },
            },
            "lines.*.ttId": {
                in: ["body"],
                isString: { errorMessage: "INVALID_TICKET_TYPE" },
                trim: true,
                notEmpty: { errorMessage: "INVALID_TICKET_TYPE" },
            },
            "lines.*.qty": {
                in: ["body"],
                isInt: {
                    options: { min: 1, max: config.reservationMaxQty ?? 20 },
                    errorMessage: "INVALID_QTY",
                },
                toInt: true,
            },
        }),
        this.handleValidationErrors,
    ];

    static validateCancelReservation = [
        checkSchema({
            id: {
                in: ["params"],
                isString: {
                    errorMessage: "Invalid ID.",
                },
                notEmpty: {
                    errorMessage: "Invalid ID.",
                },
            },
        }),
        this.handleValidationErrors,
    ];
}
