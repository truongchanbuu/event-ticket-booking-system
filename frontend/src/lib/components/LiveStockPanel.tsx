// "use client";
// import { useQuery } from "@tanstack/react-query";

// export function LiveTicketPanel({ eventId }: { eventId: string }) {
//   const { data } = useQuery({
//     queryKey: ["event-availability", eventId],
//     queryFn: async () => {
//       const r = await fetch(`/api/private/events/${eventId}/availability`, {
//         cache: "no-store",
//       });
//       if (!r.ok) throw new Error("Failed");
//       return r.json(); // { remaining: number, price: number, status: 'ONSALE'|'PAUSED'|'SOLD_OUT' }
//     },
//     refetchInterval: 3000, // hoặc WebSocket để realtime hơn
//   });

//   if (!data) return <div>Loading availability…</div>;
//   // Render nút mua, trạng thái, vv.
//   return (
//     // <BuyBox
//     //   remaining={data.remaining}
//     //   price={data.price}
//     //   status={data.status}
//     // />
//     <div>Test</div>
//   );
// }
