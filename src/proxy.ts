import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public/static routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/upload" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Pipeline API requires a secret token
  if (pathname.startsWith("/api/pipeline")) {
    const secret = req.headers.get("x-pipeline-secret") ??
      req.nextUrl.searchParams.get("secret");
    const expected = process.env.PIPELINE_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Check signed auth cookie
  const auth = req.cookies.get("auth");
  if (!auth || !(await verifyAuthToken(auth.value))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
