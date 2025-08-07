import { BaseValidator } from "@event_ticket_booking_system/shared";
import { checkSchema } from "express-validator";

export class TicketInternalValidator extends BaseValidator {
    static validateGetTicketTypes = checkSchema({
        eventID: {
            in: ["params"],
            isString: {
                errorMessage: "Invalid eventID.",
            },
            notEmpty: {
                errorMessage: "Invalid eventID.",
            },
        },
    });
}
