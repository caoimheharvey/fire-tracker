import { auth } from "@/auth"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function proxy(req: any) {
  return auth(req)
}

export const config = {
  matcher: ["/dashboard/:path*", "/uploads/:path*", "/fire/:path*", "/spending/:path*", "/api/uploads/:path*", "/api/fire/:path*", "/api/spending/:path*", "/api/parse/:path*"],
}
