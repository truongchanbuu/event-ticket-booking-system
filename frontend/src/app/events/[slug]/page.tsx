// app/events/[slug]/page.tsx
import { notFound } from "next/navigation";

export const revalidate = 60; // hoặc 0 nếu no-store

async function getData(slug: string) {
  const res = await fetch(`${process.env.API_URL}/events/${slug}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load event");
  return res.json().then((r) => r.data);
}

export default async function EventPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getData(params.slug);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Banner */}
      <section className="mb-6">
        {/* img fill + aspect */}
        {/* title, time, location */}
      </section>

      {/* Tickets */}
      <section>
        {/* map ticketTypes: name, price, availableQuantity; disable if sold out */}
        {/* “Buy” button → /checkout?eventId=...&ticketTypeId=... */}
      </section>

      {/* Description */}
      {/* Organizer box */}
    </main>
  );
}
