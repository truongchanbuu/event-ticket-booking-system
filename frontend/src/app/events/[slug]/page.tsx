import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { EventDetail } from "@/schema";
import { EVENT_STATUS } from "@/schema/enums/event-status";
import { fetchEventBySlug } from "@/lib/api/events/api";
import { EventCancelledUI } from "@/components/events/event-cancelled";
import { ErrorMessage } from "@/components/ui/error-ui-with-reload";
import { EventContainer } from "./EventContainer";

export const dynamic = "force-static";
export const revalidate = 60;
export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchEventBySlug(slug, { cache: "force-cache" });

  if (result.kind === "not_found") {
    return {
      title: "Event Not Found",
      description: "The requested event could not be found.",
      alternates: { canonical: `/events/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  if (result.kind === "cancelled") {
    const title = "Sự kiện đã huỷ";
    const description = result.reason || "Sự kiện này đã bị huỷ.";
    return {
      title,
      description,
      alternates: { canonical: `/events/${slug}` },
      robots: { index: false, follow: true },
      openGraph: { type: "website", title, description },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  if (result.kind === "error") {
    return {
      title: "There is something wrong",
      description: result.message ?? "Cannot load event.",
      alternates: { canonical: `/events/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  const event = result.data!;
  console.log(`EVNT: ${JSON.stringify(event)}`);
  const title =
    event.seo?.title ?? event.openGraph?.title ?? event.title ?? "Sự kiện";
  const description =
    event.seo?.description ??
    event.openGraph?.description ??
    event.description ??
    "Event Detail";
  const images =
    event.openGraph?.images && event.openGraph.images.length > 0
      ? event.openGraph.images
      : event.images?.length > 0
        ? [event.images[0]]
        : [];
  const canonical = event.seo?.canonical ?? `/events/${slug}`;
  const noindex = event.seo?.noindex === true;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !noindex, follow: !noindex },
    openGraph: {
      type: "website",
      title,
      description,
      images: images.map((url) => ({
        url,
        width: 1200,
        height: 630,
        alt: title,
      })),
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images[0] ?? undefined,
    },
  };
}

function generateJsonLd(event: EventDetail): string {
  const isCancelled = event.status === EVENT_STATUS.CANCELLED;

  const addr = event.location?.address?.trim();
  const hasCoords =
    typeof event.location?.coordinates?.latitude === "number" &&
    typeof event.location?.coordinates?.longitude === "number";

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title ?? "",
    description: event.description ?? "",
    startDate: event.startTime,
    endDate: event.endTime,
    eventStatus: isCancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: Array.isArray(event.images) ? event.images : [],
    url: `/events/${event.slug}`,
  };

  if (addr) {
    jsonLd.location = {
      "@type": "Place",
      name: addr,
      address: {
        "@type": "PostalAddress",
        streetAddress: addr,
      },
    };
    if (hasCoords) {
      jsonLd.location.geo = {
        "@type": "GeoCoordinates",
        latitude: event.location!.coordinates!.latitude,
        longitude: event.location!.coordinates!.longitude,
      };
    }
  }

  return JSON.stringify(jsonLd);
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchEventBySlug(slug);

  if (result.kind === "not_found") {
    notFound();
  }

  if (result.kind === "cancelled") {
    return <EventCancelledUI result={result} />;
  }

  if (result.kind === "error") {
    return <ErrorMessage error={result.message} onReload={() => {}} />;
  }

  const event = result.data!;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: generateJsonLd(event) }}
      />

      <EventContainer event={event} />
    </>
  );
}
