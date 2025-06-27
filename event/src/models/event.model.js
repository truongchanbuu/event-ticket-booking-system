module.exports =
    // events/{eventID}
    {
        eventID: string,
        organizerID: string,
        organizerName: string,
        eventTitle: string,
        eventDesc: string,
        thumbnails: [string],
        category: ["music", "..."],
        participantCount: number,
        location: string,
        startTime: Timestamp,
        endTime: Timestamp,
        ticketTypes: [
            {
                typeID: string,
                name: string,
                price: number,
                remaining: number,
            },
        ],
        status: "draft" | "published" | "cancelled",
        createdAt: Timestamp,
        updatedAt: Timestamp,

        participants: [], // Subcollection
    };
