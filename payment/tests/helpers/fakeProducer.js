export function makeFakePaymentProducer(vi) {
    return {
        succeeded: vi.fn(async () => {}),
        failed: vi.fn(async () => {}),
        canceled: vi.fn(async () => {}),
        expired: vi.fn(async () => {}),
        statusUpdated: vi.fn(async () => {}),
    };
}
