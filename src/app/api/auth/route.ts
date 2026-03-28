import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const correctPassword = process.env.AUTH_PASSWORD;
  if (!correctPassword) {
    return NextResponse.json(
      { error: "AUTH_PASSWORD not configured" },
      { status: 500 }
    );
  }

  if (body.password === correctPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth", await signAuthToken(), {
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
