import { NextRequest, NextResponse } from "next/server";
import { handler } from "../../../proxy-logic";

// Handler này đã có sẵn `path`
export async function GET(
  req: NextRequest,
  context: { params: { service: string; path: string[] } }
) {
  return handler(req, context);
}

// Lặp lại cho các method khác
export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;
