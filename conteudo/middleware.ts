import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const aberto = pathname.startsWith("/login") || pathname.startsWith("/api/login") || pathname.startsWith("/fonts");
  if (aberto) return NextResponse.next();
  const ok = req.cookies.get("auth")?.value === process.env.APP_PASSWORD;
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
