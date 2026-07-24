import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Admin routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("admin-session");
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    // mustChangePassword guard
    try {
      const session = JSON.parse(adminToken.value) as { mustChangePassword?: boolean };
      if (session.mustChangePassword && !pathname.startsWith("/admin/account")) {
        return NextResponse.redirect(new URL("/admin/account", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ─── Customer account routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/account")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url));
    }
  }

  // ─── Protect cron jobs ───────────────────────────────────────────────────────
  if (pathname.startsWith("/api/cron")) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/api/cron/:path*",
  ],
};
