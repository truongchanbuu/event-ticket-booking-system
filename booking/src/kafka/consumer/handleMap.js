import {
    PAYMENT_SUCCEEDED,
    PAYMENT_FAILED,
    PAYMENT_CANCELED,
    PAYMENT_EXPIRED,
    PAYMENT_STATUS_UPDATED,
} from "@event_ticket_booking_system/shared";

export const handlerMap = {
    [PAYMENT_SUCCEEDED]: "paymentSucceededHandler",
    [PAYMENT_FAILED]: "paymentFailedHandler",
    [PAYMENT_CANCELED]: "paymentCanceledHandler",
    [PAYMENT_EXPIRED]: "paymentExpiredHandler",
    [PAYMENT_STATUS_UPDATED]: "paymentStatusUpdatedHandler",
};
