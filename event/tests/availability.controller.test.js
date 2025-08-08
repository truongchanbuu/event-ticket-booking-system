// __tests__/availability.controller.test.js
const {
    AvailabilityController,
} = require("../src/controllers/availability.controller");

describe("AvailabilityController.getAvailability", () => {
    test("maps 404/410 and sets no-store", async () => {
        const svc = { getAvailabilityBySlug: jest.fn() };
        const ctrl = new AvailabilityController({
            availabilityService: svc,
            logger: console,
        });

        const mkRes = () => {
            const headers = {};
            return {
                set: (k, v) => (headers[k] = v),
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
                _headers: headers,
            };
        };

        // 404
        let res = mkRes();
        svc.getAvailabilityBySlug.mockResolvedValueOnce({ status: 404 });
        await ctrl.getAvailability({ params: { slug: "x" } }, res, () => {});
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res._headers["Cache-Control"]).toBe("no-store");

        // 410
        res = mkRes();
        svc.getAvailabilityBySlug.mockResolvedValueOnce({ status: 410 });
        await ctrl.getAvailability({ params: { slug: "x" } }, res, () => {});
        expect(res.status).toHaveBeenCalledWith(410);
        expect(res._headers["Cache-Control"]).toBe("no-store");

        // 200
        res = mkRes();
        svc.getAvailabilityBySlug.mockResolvedValueOnce({
            status: 200,
            data: [{ ticketTypeId: "tt1", available: 1, isSoldOut: false }],
        });
        await ctrl.getAvailability({ params: { slug: "x" } }, res, () => {});
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: [{ ticketTypeId: "tt1", available: 1, isSoldOut: false }],
        });
        expect(res._headers["Cache-Control"]).toBe("no-store");
    });
});
