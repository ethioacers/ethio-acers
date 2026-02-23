import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPaths = ["/dashboard", "/practice", "/profile", "/notes"];

export async function middleware(request: NextRequest) {
  let response: NextResponse;
  let user = null;
  try {
    const result = await updateSession(request);
    response = result.response;
    user = result.user;
  } catch (err) {
    console.error("middleware error:", err);
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((p) => path.startsWith(p));
  const isLogin = path === "/login";

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLogin && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      request.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";
    redirectUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
