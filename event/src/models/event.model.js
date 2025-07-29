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
        startTime: string,
        endTime: string,
        ticketTypes: [
            {
                typeID: string,
                name: string,
                price: number,
                remaining: number,
            },
        ],
        status: "draft" | "published" | "cancelled",
        createdAt: string,
        updatedAt: string,

        participants: [], // Subcollection
    };
