import { catchAsync } from "@event_ticket_booking_system/shared";

export class AvailabilityController {
    constructor({ config, availabilityService, logger = console }) {
        this.config = config;
        this.logger = logger;
        this.availabilityService = availabilityService;
        this.edgeTtlSec = this.config?.availability?.edgeTtlSec ?? 0;

        this.getAvailabilityBySlug = catchAsync(
            this.getAvailabilityBySlug.bind(this),
        );
        this.getAvailabilityBySlugPolling = catchAsync(
            this.getAvailabilityBySlugPolling.bind(this),
        );
    }

    async _respondAvailability(req, res) {
        const slug = String(req.query?.slug ?? "").trim();
        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Missing slug",
                statusCode: 400,
                errorCode: "VALIDATION_ERROR",
                data: null,
            });
        }

        const result = await this.availabilityService.getBySlug(slug);

        // --- SANITIZE KIỂU DỮ LIỆU ---
        let status = Number.isInteger(result?.status)
            ? result.status
            : parseInt(result?.status, 10);

        if (!Number.isInteger(status)) {
            console.error("[availability] invalid status type", {
                raw: result?.status,
                type: typeof result?.status,
            });
            status = 200; // fallback an toàn để không ném 500
        }

        let etag;
        if (result?.etag != null) {
            if (typeof result.etag === "string") etag = result.etag;
            else {
                console.error("[availability] invalid etag type", {
                    raw: result.etag,
                    type: typeof result.etag,
                });
                etag = undefined; // bỏ ETag nếu sai kiểu
            }
        }

        const data = result?.data ?? [];

        // --- Headers cache ---
        const cacheControl =
            (Number(this.edgeTtlSec) || 0) > 0
                ? `public, s-maxage=${Number(this.edgeTtlSec)}, stale-while-revalidate=5`
                : "no-store";

        res.set("Cache-Control", cacheControl);
        res.set("Vary", "If-None-Match");

        const ifNoneMatch = req.get("if-none-match") || "";
        if (status === 200 && etag && ifNoneMatch === etag) {
            return res.status(304).end();
        }
        if (etag) res.set("ETag", etag);

        return res.status(status).json(data);
    }

    async getAvailabilityBySlug(req, res) {
        return this._respondAvailability(req, res);
    }

    async getAvailabilityBySlugPolling(req, res) {
        // Nếu vẫn muốn giữ route /polling cho FE, tái dùng cùng logic
        return this._respondAvailability(req, res);
    }
}
