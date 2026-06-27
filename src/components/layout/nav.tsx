"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart2, Upload, Target, Home, LogOut } from "lucide-react"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/fire", label: "FIRE Goals", icon: Target },
  { href: "/spending", label: "Spending", icon: BarChart2 },
  { href: "/uploads", label: "Uploads", icon: Upload },
]

export function Nav({ onSignOut }: { onSignOut: () => void }) {
  const path = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            path.startsWith(href)
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
      <button
        onClick={onSignOut}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 transition-colors mt-auto"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </nav>
  )
}
