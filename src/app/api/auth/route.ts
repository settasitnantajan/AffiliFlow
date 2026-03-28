import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correctPassword = process.env.AUTH_PASSWORD ?? "affiliflow2026";

  if (password === correctPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  }

  return NextResponse.json(
    { success: false, error: "Wrong password" },
    { status: 401 }
  );
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth");
  return response;
}
