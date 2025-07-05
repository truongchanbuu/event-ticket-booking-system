import { categories } from "@/constants/categories";
import EVENT_STATUS, { EventStatusEnum } from "../enums/enum-status";
import { EventType } from "./event.schema";
import { Timestamp } from "firebase/firestore";

export const mockEvents: EventType[] = [
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
        maxPerPerson: 10,
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
        maxPerPerson: 10,
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
        maxPerPerson: 10,
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
        maxPerPerson: 10,
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
        maxPerPerson: 10,
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
        maxPerPerson: 10,
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
  {
    eventID: "evt_001",
    organizerID: "org_123",
    organizerName: "Awesome Events Co.",
    eventTitle: "Summer Music Festival 2025",
    eventDesc:
      "Join us for an unforgettable night of live music, food, and fun!",
    thumbnails: [
      "https://source.unsplash.com/random/800x600?concert",
      "https://source.unsplash.com/random/800x600?music",
    ],
    categories: [
      categories.find((c) => c.id === "music")!,
      categories.find((c) => c.id === "festival") || categories[0],
    ],
    participantCount: 150,
    location: "Central Park, New York",

    startTime: Timestamp.fromDate(new Date("2025-08-15T18:00:00Z")),
    endTime: Timestamp.fromDate(new Date("2025-08-15T23:00:00Z")),

    ticketTypes: [
      {
        typeID: "tt_standard",
        name: "Standard",
        description: "General admission ticket",
        price: 50,
        serviceFee: 5,
        remaining: 200,
        qrCode: "qrcode_standard",
        maxPerPerson: 10,
      },
      {
        typeID: "tt_vip",
        name: "VIP",
        description: "VIP ticket with backstage access",
        price: 150,
        serviceFee: 10,
        remaining: 50,
        qrCode: "qrcode_vip",
        maxPerPerson: 10,
      },
    ],

    status: EVENT_STATUS.PUBLISHED,
    createdAt: Timestamp.fromDate(new Date()),

    participants: [
      { userId: "user_001", name: "John Doe" },
      { userId: "user_002", name: "Jane Smith" },
    ],
  },
];

export const mockEvent = mockEvents[0];
