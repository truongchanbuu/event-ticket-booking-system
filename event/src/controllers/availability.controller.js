export class AvailabilityController {
    constructor({ availabilityService, logger = console }) {
        this.availabilityService = availabilityService;
        this.logger = logger;
    }

    async getAvailability(req, res, next) {
        const { slug } = req.params;
        try {
            const start = Date.now();
            const result =
                await this.availabilityService.getAvailabilityBySlug(slug);
            console.log(
                "[A2] latency_ms=%d cache_hit=%s",
                Date.now() - start,
                result._cacheHit ?? false,
            );

            if (!result) {
                res.set("Cache-Control", "no-store");
                return res.status(404).json({ error: "Not found" });
            }
            if (result.status === 404) {
                res.set("Cache-Control", "no-store");
                return res.status(404).json({ error: "Event not found" });
            }
            if (result.status === 410) {
                res.set("Cache-Control", "no-store");
                return res.status(410).json({ error: "Event cancelled" });
            }

            res.set("Cache-Control", "no-store");
            return res.json({ success: true, data: result.data });
        } catch (err) {
            return next(err);
        }
    }
}
