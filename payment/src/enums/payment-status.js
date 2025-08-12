export const PAYMENT_STATUS = {
    PENDING: "PENDING",
    SUCCEEDED: "SUCCEEDED",
    FAILED: "FAILED",
    CANCELED: "CANCELED",
    EXPIRED: "EXPIRED",
};

export const TERMINAL = new Set([
    PAYMENT_STATUS.SUCCEEDED,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELED,
    PAYMENT_STATUS.EXPIRED,
]);

export const normalizeStatus = (s) => {
    const v = String(s || "").toUpperCase();
    if (["SUCCESS", "SUCCEEDED", "OK"].includes(v))
        return PAYMENT_STATUS.SUCCEEDED;
    if (["PENDING", "PROCESSING"].includes(v)) return PAYMENT_STATUS.PENDING;
    if (["CANCELLED", "CANCELED"].includes(v)) return PAYMENT_STATUS.CANCELED;
    if (["EXPIRED", "TIMEOUT"].includes(v)) return PAYMENT_STATUS.EXPIRED;
    return PAYMENT_STATUS.FAILED;
};
