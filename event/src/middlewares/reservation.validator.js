import { param, body } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";

export class ReservationValidator extends BaseValidator {
    static validateGetAggregate() {
        return [param("ttId").isString().trim().notEmpty()];
    }

    static validateReservation() {
        return [
            param("ttId").isString().trim().notEmpty(),
            body("qty").isInt({ min: 1 }),
            body("eventId").optional().isString().trim(),
            body("hint").optional().isString().trim(),
            body("slug").optional().isString().trim(),
        ];
    }

    static validateReleaseReservation() {
        return [
            param("ttId").isString().trim().notEmpty(),
            body("qty").isInt({ min: 1 }),
            body("shardIndex").isInt({ min: 0 }),
            body("eventId").optional().isString().trim(),
            body("slug").optional().isString().trim(),
        ];
    }
}
