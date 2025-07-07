import { categories } from "@/constants/categories";
import EVENT_STATUS, { EventStatusEnum } from "../enums/event-status";
import { EventType } from "./event.schema";
import { Timestamp } from "firebase/firestore";

// Helper function to create events with different IDs and dates
const createEvent = (
  eventID: string,
  title: string,
  categoryId: string = "music",
  startTime: Date,
  endTime: Date
): EventType => ({
  eventID,
  organizerID: "org_123",
  organizerName: "Awesome Events Co.",
  eventTitle: title,
  eventDesc: `Join us for an unforgettable ${title.toLowerCase()} experience!`,
  thumbnails: [
    "https://source.unsplash.com/random/800x600?concert",
    "https://source.unsplash.com/random/800x600?music",
  ],
  categories: [categories.find((c) => c.id === categoryId) || categories[0]],
  participantCount: Math.floor(Math.random() * 200) + 50,
  location: "Central Park, New York",
  startTime: Timestamp.fromDate(startTime),
  endTime: Timestamp.fromDate(endTime),
  ticketTypes: [
    {
      typeID: "tt_standard",
      name: "Standard",
      description: "General admission ticket",
      price: 50,
      serviceFee: 5,
      remaining: 200,
      maxPerPerson: 10,
    },
    {
      typeID: "tt_vip",
      name: "VIP",
      description: "VIP ticket with backstage access",
      price: 150,
      serviceFee: 10,
      remaining: 50,
      maxPerPerson: 10,
    },
  ],
  status: EVENT_STATUS.PUBLISHED,
  createdAt: Timestamp.fromDate(new Date()),
});

// Create events with different dates
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

export const mockEvents: EventType[] = [
  // Past events
  createEvent(
    "evt_001",
    "Summer Music Festival 2024",
    "music",
    oneWeekAgo,
    new Date(oneWeekAgo.getTime() + 5 * 60 * 60 * 1000)
  ),
  createEvent(
    "evt_002",
    "Winter Concert Series",
    "music",
    oneDayAgo,
    new Date(oneDayAgo.getTime() + 3 * 60 * 60 * 1000)
  ),

  // Ongoing events (currently happening)
  createEvent(
    "evt_003",
    "Spring Jazz Night",
    "music",
    new Date(now.getTime() - 2 * 60 * 60 * 1000),
    new Date(now.getTime() + 2 * 60 * 60 * 1000)
  ),
  createEvent(
    "evt_004",
    "Live Rock Concert",
    "music",
    new Date(now.getTime() - 1 * 60 * 60 * 1000),
    new Date(now.getTime() + 4 * 60 * 60 * 1000)
  ),

  // Upcoming events
  createEvent(
    "evt_005",
    "Classical Symphony Evening",
    "music",
    oneDayLater,
    new Date(oneDayLater.getTime() + 3 * 60 * 60 * 1000)
  ),
  createEvent(
    "evt_006",
    "Electronic Dance Party",
    "music",
    oneWeekLater,
    new Date(oneWeekLater.getTime() + 6 * 60 * 60 * 1000)
  ),
  createEvent(
    "evt_007",
    "Country Music Festival",
    "music",
    new Date(oneWeekLater.getTime() + 2 * 24 * 60 * 60 * 1000),
    new Date(
      oneWeekLater.getTime() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000
    )
  ),
  createEvent(
    "evt_008",
    "Blues & Soul Night",
    "music",
    new Date(oneWeekLater.getTime() + 3 * 24 * 60 * 60 * 1000),
    new Date(
      oneWeekLater.getTime() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
    )
  ),
  createEvent(
    "evt_009",
    "Pop Music Extravaganza",
    "music",
    new Date(oneWeekLater.getTime() + 5 * 24 * 60 * 60 * 1000),
    new Date(
      oneWeekLater.getTime() + 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000
    )
  ),
  createEvent(
    "evt_010",
    "Indie Rock Showcase",
    "music",
    new Date(oneWeekLater.getTime() + 7 * 24 * 60 * 60 * 1000),
    new Date(
      oneWeekLater.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
    )
  ),
];

export const mockEvent = mockEvents[0];
