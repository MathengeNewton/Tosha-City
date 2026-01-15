import { NextResponse } from "next/server";

const SIMULATED_SESSION = {
  isLoggedIn: true,
  role: "admin",
  name: "Rev. Peter Kamau",
  email: "peter.kamau@pcea.or.ke",
  parish: "PCEA St. Andrews Nairobi",
};

export async function proxy(request) {
  const { pathname, origin } = request.nextUrl;
  const { isLoggedIn, role } = SIMULATED_SESSION;

  // 1. Not logged in → protect dashboards
  if (!isLoggedIn) {
    if (
      pathname.startsWith("/admin/dashboard") ||
      pathname.startsWith("/user/dashboard")
    ) {
      return NextResponse.redirect(new URL("/login", origin));
    }
    return NextResponse.next();
  }

  // 2. Logged in → hide login pages
  if (
    pathname === "/login" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    const home = role === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return NextResponse.redirect(new URL(home, origin));
  }

  // 3. Role protection
  if (role === "admin" && pathname.startsWith("/user/dashboard")) {
    return NextResponse.redirect(new URL("/admin/dashboard", origin));
  }

  if (role === "user" && pathname.startsWith("/admin/dashboard")) {
    return NextResponse.redirect(new URL("/user/dashboard", origin));
  }

  // 4. Everything else → allow
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/admin/dashboard/:path*",
    "/user/dashboard/:path*",
  ],
};
