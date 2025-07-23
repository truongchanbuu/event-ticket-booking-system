import { APP_NAME } from "@/constants/app";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: "%s | Event Ticket Booking",
  },
  description:
    "A cloud-native, scalable platform for creating, managing, and booking event tickets. Optimized for concerts, conferences, and high-traffic events.",
  keywords: [
    "event booking",
    "ticket booking",
    "concert tickets",
    "conference tickets",
    "online ticket system",
    "Next.js",
    "Node.js",
    "Kubernetes",
    "GCP",
  ],
  applicationName: "Event Ticket Booking System",
  authors: [{ name: "Buu Truong" }],
  creator: "Buu Truong",
  publisher: "Event Ticket Booking Team",
  metadataBase: new URL("https://event-ticket-booking.com"),
  alternates: {
    canonical: "https://event-ticket-booking.com",
  },
  openGraph: {
    title: "Event Ticket Booking System",
    description:
      "A modern platform to create, manage, and book event tickets with scalable microservice architecture and high concurrency support.",
    url: "https://event-ticket-booking.com",
    siteName: "Event Ticket Booking",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Event Ticket Booking System Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Event Ticket Booking System",
    description:
      "Create, manage, and book event tickets seamlessly. Scalable microservice-based platform for concerts, conferences, and more.",
    images: ["/og-image.png"],
    creator: "@eventbooking",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-32x32.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};
