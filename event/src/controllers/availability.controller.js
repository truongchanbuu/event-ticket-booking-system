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
        const minInvVersion =
            req.query.minInvVersion != null
                ? Number(req.query.minInvVersion)
                : undefined;
        const forceRefresh =
            req.query.force === "1" || req.query.noCache === "1";
        const result = await this.availabilityService.getBySlug(slug, {
            minInvVersion,
            forceRefresh,
        });

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
        const edgeTtl = Number(this.edgeTtlSec) || 0;
        const cacheControl =
            edgeTtl > 0
                ? `public, max-age=0, s-maxage=${edgeTtl}, stale-while-revalidate=5, stale-if-error=30`
                : "no-cache";

        res.set("Cache-Control", cacheControl);
        // res.set("Vary", "If-None-Match");

        const ifNoneMatch = req.get("if-none-match") || "";
        const matches =
            etag &&
            ifNoneMatch
                .split(",")
                .map((s) => s.trim())
                .includes(etag);
        if (status === 200 && matches) {
            return res.status(304).end();
        }
        if (etag) res.set("ETag", etag);

        return res.status(status).json(data);
    }

    async getAvailabilityBySlugHead(req, res) {
        const slug = String(req.query?.slug ?? "").trim();
        if (!slug) return res.status(400).end();
        const result = await this.availabilityService.getBySlug(slug);
        const status = Number.isInteger(result?.status) ? result.status : 200;
        const etag = typeof result?.etag === "string" ? result.etag : undefined;

        res.set(
            "Cache-Control",
            this.edgeTtlSec > 0
                ? `public, max-age=0, s-maxage=${this.edgeTtlSec}, stale-while-revalidate=5, stale-if-error=30`
                : "no-cache",
        );
        if (etag) res.set("ETag", etag);

        const ifNoneMatch = req.get("if-none-match") || "";
        const matches =
            etag &&
            ifNoneMatch
                .split(",")
                .map((s) => s.trim())
                .includes(etag);
        if (status === 200 && matches) return res.status(304).end();
        return res.status(status).end();
    }

    async getAvailabilityBySlug(req, res) {
        return this._respondAvailability(req, res);
    }

    async getAvailabilityBySlugPolling(req, res) {
        // Nếu vẫn muốn giữ route /polling cho FE, tái dùng cùng logic
        return this._respondAvailability(req, res);
    }
}
