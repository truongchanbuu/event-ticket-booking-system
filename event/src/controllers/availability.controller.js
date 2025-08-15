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
        this.getAvailabilityBySlugHead = catchAsync(
            this.getAvailabilityBySlugHead.bind(this),
        );
    }

    _edgeCacheHeader() {
        const s = Number(this.edgeTtlSec) || 0;
        return s > 0
            ? `public, max-age=0, s-maxage=${s}, stale-while-revalidate=5, stale-if-error=30`
            : "no-cache";
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

        res.set("Cache-Control", this._edgeCacheHeader());
        // res.set("Vary", "If-None-Match");

        const ifNoneMatch = (req.get("if-none-match") || "").trim();
        if (ifNoneMatch) {
            try {
                const fastEtag = await this.availabilityService.peekEtag(slug);
                if (fastEtag && fastEtag === ifNoneMatch)
                    return res.status(304).end();
            } catch {}
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

        let status = Number.isInteger(result?.status)
            ? result.status
            : parseInt(result?.status, 10);
        if (!Number.isInteger(status)) status = 200;

        const etag = typeof result?.etag === "string" ? result.etag : undefined;
        const data = result?.data ?? [];

        const matches =
            etag &&
            ifNoneMatch
                .split(",")
                .map((s) => s.trim())
                .includes(etag);
        if (status === 200 && matches) return res.status(304).end();

        if (etag) res.set("ETag", etag);
        return res.status(status).json(data);
    }

    async getAvailabilityBySlug(req, res) {
        return this._respondAvailability(req, res);
    }
    async getAvailabilityBySlugPolling(req, res) {
        return this._respondAvailability(req, res);
    }

    async getAvailabilityBySlugHead(req, res) {
        const slug = String(req.query?.slug ?? "").trim();
        if (!slug) return res.status(400).end();

        res.set("Cache-Control", this._edgeCacheHeader());

        const ifNoneMatch = (req.get("if-none-match") || "").trim();
        const fast = await this.availabilityService.peekEtag(slug);
        if (fast) res.set("ETag", fast);
        if (ifNoneMatch && fast && ifNoneMatch === fast)
            return res.status(304).end();

        // Nếu muốn chắc chắn có ETag khi cache chưa nóng, có thể warm-up:
        // const full = await this.availabilityService.getBySlug(slug);
        // if (typeof full?.etag === "string") res.set("ETag", full.etag);
        return res.status(200).end();
    }
}
