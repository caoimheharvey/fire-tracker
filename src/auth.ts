import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL) {
        return false
      }
      return true
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
})
