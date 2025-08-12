import { checkSchema } from "express-validator";
import { BaseValidator } from "@event_ticket_booking_system/shared";
import { ALLOWED_PROVIDERS } from "../enums/payment-provider.js";

export class PaymentValidator extends BaseValidator {
    static validateCreatePaymentMethod = [
        checkSchema({
            provider: {
                in: ["body"],
                exists: {
                    errorMessage: "Provider is required.",
                },
                isString: {
                    errorMessage: "Provider must be a string.",
                },
                isIn: {
                    options: [ALLOWED_PROVIDERS],
                    errorMessage: `Provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}.`,
                },
            },
            displayName: {
                in: ["body"],
                exists: {
                    errorMessage: "displayName is required.",
                },
                isString: {
                    errorMessage: "displayName must be a string.",
                },
                trim: true,
                isLength: {
                    options: { min: 3, max: 50 },
                    errorMessage:
                        "displayName must be between 3 and 50 characters.",
                },
            },
            account: {
                in: ["body"],
                optional: { options: { nullable: true, checkFalsy: true } }, // Cho phép null hoặc chuỗi rỗng
                isString: true,
                matches: {
                    options: /^(0[3|5|7|8|9])+([0-9]{8})$/, // Regex cơ bản cho SĐT Việt Nam
                    errorMessage: "Invalid Vietnamese phone number format.",
                },
            },
            isDefault: {
                in: ["body"],
                optional: true,
                isBoolean: {
                    errorMessage:
                        "isDefault must be a boolean (true or false).",
                },
                toBoolean: true, // Chuyển đổi 'true', '1' thành true
            },
            metadata: {
                in: ["body"],
                optional: true,
                isObject: {
                    errorMessage: "metadata must be an object.",
                },
            },
        }),
        this.handleValidationErrors,
    ];

    static validateUpdatePaymentMethod = [
        checkSchema({
            paymentMethodID: {
                in: ["params"],
                isString: {
                    errorMessage: "Invalid payment method ID.",
                },
                notEmpty: {
                    errorMessage: "Invalid payment method ID.",
                },
            },
            provider: {
                in: ["body"],
                optional: true,
                isString: true,
                isIn: {
                    options: [ALLOWED_PROVIDERS],
                    errorMessage: `Provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}.`,
                },
            },
            displayName: {
                in: ["body"],
                optional: true,
                isString: true,
                trim: true,
                isLength: {
                    options: { min: 3, max: 50 },
                    errorMessage:
                        "displayName must be between 3 and 50 characters.",
                },
            },
            account: {
                in: ["body"],
                optional: { options: { nullable: true, checkFalsy: true } },
                isString: true,
                matches: {
                    options: /^(0[3|5|7|8|9])+([0-9]{8})$/,
                    errorMessage: "Invalid Vietnamese phone number format.",
                },
            },
            isDefault: {
                in: ["body"],
                optional: true,
                isBoolean: {
                    errorMessage: "isDefault must be a boolean.",
                },
                toBoolean: true,
            },
        }),
        this.handleValidationErrors,
    ];

    static validateDeletePaymentMethod = [
        checkSchema({
            paymentMethodID: {
                in: ["params"],
                isString: {
                    errorMessage: "Invalid payment method ID.",
                },
                notEmpty: {
                    errorMessage: "Invalid payment method ID.",
                },
            },
        }),
        this.handleValidationErrors,
    ];

    static validateConfirmByIntent = [
        checkSchema({
            paymentIntentID: {
                in: ["body"],
                optional: { options: { nullable: true, checkFalsy: true } },
                isString: { errorMessage: "paymentIntentID must be a string." },
                trim: true,
            },
            reservationID: {
                in: ["body"],
                optional: { options: { nullable: true, checkFalsy: true } },
                isString: { errorMessage: "reservationID must be a string." },
                trim: true,
            },
            refresh: {
                in: ["body"],
                optional: true,
                isBoolean: { errorMessage: "refresh must be a boolean." },
                toBoolean: true,
            },
            // Cross-field requirement
            _atLeastOne: {
                custom: {
                    options: (_v, { req }) => {
                        const { paymentIntentID, reservationID } =
                            req.body || {};
                        if (!paymentIntentID && !reservationID) {
                            throw new Error(
                                "Either paymentIntentID or reservationID is required.",
                            );
                        }
                        return true;
                    },
                },
            },
        }),
        this.handleValidationErrors,
    ];
}
