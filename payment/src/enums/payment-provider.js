export const PROVIDER_TYPE_MAP = {
    momo: "ewallet",
    zalopay: "ewallet",
    stripe: "card",
};

export const ALLOWED_PROVIDERS = Object.keys(PROVIDER_TYPE_MAP);

export const MOMO_MODES = new Set(["mock", "merchant", "manual"]);

export function mapMomoStatus(resultCode) {
    const code = Number(resultCode);

    // Momo's official mapping
    if (code === 0) return "SUCCEEDED"; // Thành công
    if (code === 1000) return "PENDING"; // Chờ xử lý
    if (code === 49 || code === 9043) return "EXPIRED"; // Hết hạn
    if (code === 53) return "CANCELED"; // Bị hủy
    return "FAILED"; // Còn lại coi như thất bại
}
