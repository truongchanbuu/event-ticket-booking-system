import { catchAsync } from "@event_ticket_booking_system/shared";
import { availabilityLatency } from "../metrics/availability.metric.js";

export class AvailabilityController {
    constructor({ availabilityService, logger = console }) {
        this.availabilityService = availabilityService;
        this.logger = logger;

        this.getAvailabilityBySlug = catchAsync(
            this.getAvailabilityBySlug.bind(this),
        );
        this.getAvailabilityBySlugPolling = catchAsync(
            this.getAvailabilityBySlugPolling.bind(this),
        );
    }

    async getAvailabilityBySlug(req, res, next) {
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ message: "Missing slug" });

        const result = await this.availabilityService.getBySlug(String(slug));
        // result: { status, data, etag?, lastUpdatedAt? }

        const ifNoneMatch = req.get("if-none-match");
        if (
            result.status === 200 &&
            result.etag &&
            ifNoneMatch === result.etag
        ) {
            res.set(
                "Cache-Control",
                process.env.AVAIL_EDGE_TTL_SEC
                    ? `public, s-maxage=${process.env.AVAIL_EDGE_TTL_SEC}, stale-while-revalidate=5`
                    : "no-store",
            );
            return res.status(304).end();
        }

        if (result.etag) res.set("ETag", result.etag);
        res.set(
            "Cache-Control",
            process.env.AVAIL_EDGE_TTL_SEC
                ? `public, s-maxage=${process.env.AVAIL_EDGE_TTL_SEC}, stale-while-revalidate=5`
                : "no-store",
        );

        return res.status(result.status).json(result.data ?? []);
    }

    async getAvailabilityBySlugPolling(req, res) {
        const slug = String(req.query.slug || "");
        if (!slug) return res.status(400).json({ message: "Missing slug" });

        const result = await this.availabilityService.getBySlug(slug); // {status, data, etag, lastUpdatedAt}

        const ifNoneMatch = req.get("if-none-match");
        const edgeTtl = Number(
            process.env.AVAIL_EDGE_TTL_SEC ||
                config?.availability?.edgeTtlSec ||
                0,
        );
        const cacheControl =
            edgeTtl > 0
                ? `public, s-maxage=${edgeTtl}, stale-while-revalidate=5`
                : "no-store";

        // 304 khi ETag khớp
        if (
            result.status === 200 &&
            result.etag &&
            ifNoneMatch === result.etag
        ) {
            res.set("Cache-Control", cacheControl);
            return res.status(304).end();
        }

        if (result.etag) res.set("ETag", result.etag);
        res.set("Cache-Control", cacheControl);

        return res.status(result.status).json(result.data ?? []);
    }
}
