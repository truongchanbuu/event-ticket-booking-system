import { NextRequest, NextResponse } from "next/server";
import { handler, resolveParams } from "../proxy-logic";

export async function GET(
  req: NextRequest,
  context: { params: { service: string } }
) {
  const resolvedParams = await resolveParams(context.params);
  const newContext = { params: resolvedParams } as {
    params: { service: string; path: [] };
  };
  return handler(req, newContext);
}

// Lặp lại cho các method khác
export const POST = GET; // Tạm thời dùng GET cho tất cả để test
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;
