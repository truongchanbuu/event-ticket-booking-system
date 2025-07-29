import { verifySession } from "@/lib/api/auth/api";
import { NextRequest, NextResponse } from "next/server";

export async function authMiddleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) {
    console.warn("🚫 No session cookie");
    return redirectToLogin(url, "🚫 No session cookie");
  }

  try {
    const result: any = await verifySession(sessionCookie);
    console.log("result with cookies: ", result);
    if (!result?.ok || !result?.user) {
      return redirectToLogin(url, "❌ Invalid session");
    }

    const { role, uid, email } = result.user;

    if (pathname.startsWith("/admin") && role !== "admin") {
      return redirect("/unauthorized", req);
    }

    return NextResponse.next();
  } catch (err) {
    console.error("🔥 Verification error:", err);
    const response = redirectToLogin(url, pathname);
    response.cookies.delete("session");
    return response;
  }
}

// Helpers
function redirectToLogin(url: URL, reason?: string) {
  if (reason) console.warn(reason);
  url.pathname = "/";
  return NextResponse.redirect(url);
}

function redirect(path: string, req: NextRequest) {
  return NextResponse.redirect(new URL(path, req.url));
}
