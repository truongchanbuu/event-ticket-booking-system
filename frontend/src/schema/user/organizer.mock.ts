import { ORGANIZER_STATUS } from "../enums/organizer-status";
import ROLE from "../enums/role";
import { Organizer } from "./organizer.schema";

export const mockOrganizers: Organizer[] = [
  {
    organizerId: "org_123456",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",

    websiteUrl: "https://www.awesomeevents.com",
    facebookUrl: "https://www.facebook.com/awesomeevents",
    instagramUrl: "https://www.instagram.com/awesomeevents",
    xUrl: "https://www.x.com/awesomeevents",
  },
  {
    organizerId: "org_123457",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",
  },
  {
    organizerId: "org_123458",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",
  },
  {
    organizerId: "org_123459",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",
  },
  {
    organizerId: "org_123410",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",
  },
  {
    organizerId: "org_123411",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",
  },
  {
    organizerId: "org_123452",
    organizerStatus: ORGANIZER_STATUS.APPROVED,
    followersCount: 1200,
    eventsCount: 15,

    // From UserSchema
    email: "organizer@example.com",
    phone: "+1234567890",
    photoUrl: "https://example.com/avatar.jpg",
    role: ROLE.EVENT_ORGANIZER,
    name: "Awesome Events",
  },
];

export const mockOrganizer: Organizer = mockOrganizers[0];
