import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { senha } = await req.json();
  if (!process.env.APP_PASSWORD || senha !== process.env.APP_PASSWORD) {
    return NextResponse.json({ erro: "senha" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", process.env.APP_PASSWORD, {
    httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 90, path: "/",
  });
  return res;
}
