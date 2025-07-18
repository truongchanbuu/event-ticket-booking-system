"use client";

import { useAuth } from "@/app/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Organizer, EventType } from "@/schema";
import OrganizerEventsManager from "@/components/events/OrganizerEventsManager";
import LoadingPage from "@/components/app-loading";
import { mockEvents } from "@/schema/events/events.mock";
import { mockOrganizer } from "@/schema/user/organizer.mock";
import { useRouter } from "next/navigation";

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { organizerId } = useParams<{ organizerId: string }>();
  const { user, role, isAuthLoading } = useAuth();

  // Fetch organizer data
  const { data: organizer, isLoading: organizerLoading } = useQuery<Organizer>({
    queryKey: [`/api/profile/organizers`],
    enabled: Boolean(organizerId),
    placeholderData: mockOrganizer,
  });

  // Fetch events data
  const { data: events = [], isLoading: eventsLoading } = useQuery<EventType[]>(
    {
      queryKey: [`/api/organizers/${organizerId}/events`],
      enabled: Boolean(organizerId),
      placeholderData: mockEvents,
    }
  );

  if (isAuthLoading || organizerLoading) {
    return <LoadingPage />;
  }

  // Check if user is organizer (from custom claims)
  const isOrganizer = role === "event_organizer";

  // If user is organizer and this is their own organizer page, show management interface
  if (!isOrganizer) {
    router.replace("/profile/events");
    return;
  }

  return (
    <OrganizerEventsManager organizerId={organizerId as string} user={user} />
  );
}
