export function makePaymentProviderFactory({
    config,
    momoProvider,
    mockMomoProvider,
}) {
    // MVP: hệ thống toàn mock qua env. Sau này: đọc paymentMode theo organizer từ DB.
    return async function paymentProviderFactory(/* organizerId? */) {
        const mode = config.paymentClients.momo.mode;
        return mode === "merchant" ? momoProvider : mockMomoProvider;
    };
}

export function makePaymentProviderFactory({
    config,
    momoProvider,
    mockMomoProvider,
}) {
    // MVP: hệ thống toàn mock qua env. Sau này: đọc paymentMode theo organizer từ DB.
    return async function paymentProviderFactory(/* organizerId? */) {
        const mode = config.paymentClients.momo.mode;
        return mode === "merchant" ? momoProvider : mockMomoProvider;
    };
}
