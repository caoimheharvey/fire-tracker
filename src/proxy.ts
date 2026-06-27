export { auth as proxy } from "@/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/uploads/:path*", "/fire/:path*", "/spending/:path*", "/api/uploads/:path*", "/api/fire/:path*", "/api/spending/:path*", "/api/parse/:path*"],
}
