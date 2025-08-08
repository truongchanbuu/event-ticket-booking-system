import { availabilityLatency } from "../metrics/availability.metric.js";

export class AvailabilityController {
    constructor({ availabilityService, logger = console }) {
        this.availabilityService = availabilityService;
        this.logger = logger;
    }

    getAvailability = async (req, res, next) => {
        const endTimer = availabilityLatency.startTimer({
            method: "GET",
            route: "/events/:slug/availability",
        });

        try {
            const r = await this.availabilityService.getAvailabilityBySlug(
                req.params.slug,
            );

            res.set("Cache-Control", "no-store");

            if (!r || r.status === 404) {
                endTimer({ status_code: 404 });
                return res.status(404).json({ error: "Event not found" });
            }
            if (r.status === 410) {
                endTimer({ status_code: 410 });
                return res.status(410).json({ error: "Event cancelled" });
            }

            endTimer({ status_code: 200 });
            return res.json({ success: true, data: r.data });
        } catch (e) {
            endTimer({ status_code: 500 });
            return next(e);
        }
    };
}
