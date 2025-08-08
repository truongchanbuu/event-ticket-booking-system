// __tests__/event.publish.test.js
const { EventService } = require("../src/services/event.service");

function mkDeps() {
    return {
        db: { runTransaction: jest.fn() },
        eventCollection: { doc: jest.fn() },
        redisService: { setRaw: jest.fn(), del: jest.fn() },
        ticketClientService: { getEventTicketTypes: jest.fn() },
        eventLifecycleEventService: { sendEventPublished: jest.fn() },
        logger: console,
        contributorService: {},
    };
}

describe("EventService.publishEvent", () => {
    test("initializes inventory keys after publish", async () => {
        const d = mkDeps();
        const eventID = "ev1";

        const eventRef = {
            /* fake doc ref */
        };
        d.eventCollection.doc.mockReturnValue(eventRef);

        // Firestore transaction mock
        const tx = { get: jest.fn(), update: jest.fn() };
        d.db.runTransaction.mockImplementation(async (fn) => {
            // Simulate existing draft event
            tx.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    organizer: { organizerID: "org1" },
                    status: "DRAFT",
                    startTime: new Date(Date.now() + 3600_000).toISOString(),
                }),
            });
            await fn(tx);
        });

        d.ticketClientService.getEventTicketTypes
            .mockResolvedValueOnce([
                { ticketTypeID: "tt1", totalQuantity: 100 },
                { ticketTypeID: "tt2", totalQuantity: 50 },
            ]) // pre-check
            .mockResolvedValueOnce([
                { ticketTypeID: "tt1", totalQuantity: 100 },
                { ticketTypeID: "tt2", totalQuantity: 50 },
            ]); // init phase

        const svc = new EventService({
            db: d.db,
            redisService: d.redisService,
            contributorService: d.contributorService,
            ticketClientService: d.ticketClientService,
            eventLifecycleEventService: d.eventLifecycleEventService,
            logger: d.logger,
        });

        // inject eventCollection stub (tuỳ code bạn, có thể cần sửa constructor)
        svc.eventCollection = d.eventCollection;

        const res = await svc.publishEvent(eventID, "org1");
        expect(res.success).toBe(true);

        // setRaw called for each ticket type
        expect(d.redisService.setRaw).toHaveBeenCalledWith(
            "inv:tt1:remaining",
            "100",
            { ttl: 0 },
        );
        expect(d.redisService.setRaw).toHaveBeenCalledWith(
            "inv:tt2:remaining",
            "50",
            { ttl: 0 },
        );

        // lifecycle emitted
        expect(
            d.eventLifecycleEventService.sendEventPublished,
        ).toHaveBeenCalled();
    });
});
