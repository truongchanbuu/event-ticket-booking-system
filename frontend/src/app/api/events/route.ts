// import { NextResponse } from "next/server";
// import { createSlug } from "@/lib/slug";
// import { v4 as uuidv4 } from "uuid";

// export async function POST(req: Request) {
//   const body = await req.json();
//   const { title, date, location } = body;

//   const eventId = uuidv4();
//   const slug = createSlug(title);

//   await firestore.collection("events").doc(eventId).set({
//     id: eventId,
//     slug,
//     title,
//     date,
//     location,
//     createdAt: Date.now(),
//   });

//   return NextResponse.json({ slug });
// }
