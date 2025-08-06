import { checkSchema } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";

export class TicketValidator extends BaseValidator {
    static createTicketValidator = checkSchema({
        eventID: {
            isString: {
                errorMessage: "Event ID is required.",
            },
            notEmpty: {
                errorMessage: "Event ID cannot be empty.",
            },
        },
        name: {
            notEmpty: {
                errorMessage: "Ticket name is required.",
            },
            isString: {
                errorMessage: "Ticket name must be a string.",
            },
        },
        price: {
            notEmpty: {
                errorMessage: "Price is required.",
            },
            isFloat: {
                options: { min: 0 },
                errorMessage:
                    "Price must be a number greater than or equal to 0.",
            },
        },
        currency: {
            notEmpty: {
                errorMessage: "Currency is required.",
            },
            isString: {
                errorMessage: "Currency must be a string.",
            },
            isLength: {
                options: { min: 3, max: 3 },
                errorMessage: "Currency must be exactly 3 characters long.",
            },
            custom: {
                options: (value) => /^[A-Z]{3}$/.test(value),
                errorMessage:
                    "Currency must contain 3 uppercase letters (e.g., USD, VND).",
            },
        },
        totalQuantity: {
            notEmpty: {
                errorMessage: "Total quantity is required.",
            },
            isInt: {
                options: { min: 1 },
                errorMessage:
                    "Total quantity must be an integer greater than or equal to 1.",
            },
        },
    });

    static validateGetTicketType = checkSchema({
        eventID: {
            in: ["params"],
            isString: { errorMessage: "Invalid event ID" },
            notEmpty: {
                errorMessage: "Invalid event ID",
            },
        },
    });

    static validateUpdateTicketType = checkSchema({
        ticketTypeID: {
            in: ["params"],
            isString: {
                errorMessage: "Ticket Type is required.",
            },
            notEmpty: {
                errorMessage: "Ticket Type is required.",
            },
        },
        name: {
            notEmpty: {
                errorMessage: "Ticket name is required.",
            },
            isString: {
                errorMessage: "Ticket name must be a string.",
            },
            optional: true,
        },
        price: {
            notEmpty: {
                errorMessage: "Price is required.",
            },
            isFloat: {
                options: { min: 0 },
                errorMessage:
                    "Price must be a number greater than or equal to 0.",
            },
            optional: true,
        },
        currency: {
            notEmpty: {
                errorMessage: "Currency is required.",
            },
            isString: {
                errorMessage: "Currency must be a string.",
            },
            isLength: {
                options: { min: 3, max: 3 },
                errorMessage: "Currency must be exactly 3 characters long.",
            },
            custom: {
                options: (value) => /^[A-Z]{3}$/.test(value),
                errorMessage:
                    "Currency must contain 3 uppercase letters (e.g., USD, VND).",
            },
            optional: true,
        },
        totalQuantity: {
            notEmpty: {
                errorMessage: "Total quantity is required.",
            },
            isInt: {
                options: { min: 1 },
                errorMessage:
                    "Total quantity must be an integer greater than or equal to 1.",
            },
            optional: true,
        },
    });

    static validateTicketTypeDelete = checkSchema({
        ticketTypeID: {
            in: ["params"],
            isString: {
                errorMessage: "Invalid Ticket Type.",
            },
            notEmpty: {
                errorMessage: "It cannot be empty.",
            },
        },
    });
}
