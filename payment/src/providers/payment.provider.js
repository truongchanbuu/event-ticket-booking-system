/**
 * Interface cho các payment provider.
 * Tất cả provider (Momo, ZaloPay, Mock...) phải implement đầy đủ.
 */
export class PaymentProvider {
    /**
     * @param {Object} opts - Thông tin khởi tạo (có thể chứa http client, config, logger...)
     */
    constructor(opts = {}) {
        this.logger = opts.logger || console;
    }

    /**
     * Tạo order thanh toán mới.
     * @param {Object} params
     * @param {string} params.orderId - Mã order nội bộ
     * @param {number} params.amount - Số tiền
     * @param {string} params.orderInfo - Mô tả đơn hàng
     * @param {Object} params.extraData - Data phụ (vd: reservationId, organizerId)
     * @returns {Promise<{ payUrl: string, orderId: string, raw?: any }>}
     */
    async createPayment(params) {
        throw new Error("Not implemented");
    }

    /**
     * Verify trạng thái thanh toán bằng query tới provider.
     * @param {Object} params
     * @param {string} params.orderId
     * @param {string} [params.transactionId]
     * @param {number} [params.amount]
     * @param {string} [params.currency]
     * @returns {Promise<{ status: string, orderId: string, transactionId?: string, amount?: number, currency?: string, raw?: any }>}
     */
    async verify(params) {
        throw new Error("Not implemented");
    }

    /**
     * Verify IPN/Webhook từ provider gửi tới.
     * @param {Object} payload - Raw body từ webhook
     * @returns {Promise<{ ok: boolean, status: string, orderId: string, transactionId?: string, amount?: number, currency?: string, raw?: any }>}
     */
    async verifyIpn(payload) {
        throw new Error("Not implemented");
    }
}
