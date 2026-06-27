import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "FIRE Tracker",
  description: "Personal financial independence tracker",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.variable} font-sans bg-zinc-950 text-zinc-100 min-h-full antialiased`}>
        {children}
      </body>
    </html>
  )
}
