import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { slug, secret } = await req.json();
  if (secret !== process.env.REVALIDATE_KEY)
    return new Response("forbidden", { status: 403 });

  revalidateTag(`event:slug:${slug}`);
  revalidatePath(`/events/${slug}`);
  return new Response("ok");
}
