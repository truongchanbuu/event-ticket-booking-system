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
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ message: "Missing slug" });

        const result = await this.availabilityService.getBySlug(String(slug));
        console.log(`result: ${JSON.stringify(result)}`);

        const cacheControl =
            this.edgeTtlSec > 0
                ? `public, s-maxage=${this.edgeTtlSec}, stale-while-revalidate=5`
                : "no-store";

        const ifNoneMatch = req.get("if-none-match");
        if (
            result.status === 200 &&
            result.etag &&
            ifNoneMatch === result.etag
        ) {
            res.set("Cache-Control", cacheControl);
            res.set("Vary", "If-None-Match");
            return res.status(304).end();
        }

        if (result.etag) res.set("ETag", result.etag);
        res.set("Cache-Control", cacheControl);
        res.set("Vary", "If-None-Match");

        return res.status(result.status).json(result.data ?? []);
    }

    async getAvailabilityBySlug(req, res) {
        return this._respondAvailability(req, res);
    }

    async getAvailabilityBySlugPolling(req, res) {
        // Nếu vẫn muốn giữ route /polling cho FE, tái dùng cùng logic
        return this._respondAvailability(req, res);
    }
}
