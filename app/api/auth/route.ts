import { cookies } from "next/headers";

const PASSCODE = "5555";
const COOKIE_NAME = "auth_token";

export async function POST(request: Request) {
  const { passcode } = await request.json();

  if (passcode !== PASSCODE) {
    return Response.json({ error: "Invalid passcode" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
