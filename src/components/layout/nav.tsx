"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BarChart2, Upload, Target, LayoutDashboard, LogOut } from "lucide-react"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fire", label: "FIRE Goals", icon: Target },
  { href: "/spending", label: "Spending", icon: BarChart2 },
  { href: "/uploads", label: "Uploads", icon: Upload },
]

export function Nav({ onSignOut }: { onSignOut: () => void }) {
  const path = usePathname()
  return (
    <nav className="flex flex-col gap-0.5 p-3 flex-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white/[0.1] text-white border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
            )}
          >
            <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-violet-400" : "text-white/40")} />
            {label}
          </Link>
        )
      })}
      <div className="flex-1" />
      <button
        onClick={onSignOut}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-all duration-200"
      >
        <LogOut className="h-4 w-4 flex-shrink-0 text-white/30" />
        Sign out
      </button>
    </nav>
  )
}

export function MobileNav({ onSignOut }: { onSignOut: () => void }) {
  const path = usePathname()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden"
      style={{
        background: "rgba(8,8,15,0.85)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex w-full items-center justify-around px-2 pb-safe">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-3 min-w-[60px]"
            >
              <Icon
                className={cn("h-5 w-5 transition-colors", active ? "text-violet-400" : "text-white/35")}
              />
              <span className={cn("text-[10px] font-medium transition-colors", active ? "text-white/80" : "text-white/30")}>
                {label.split(" ")[0]}
              </span>
            </Link>
          )
        })}
        <button
          onClick={onSignOut}
          className="flex flex-col items-center gap-1 px-3 py-3 min-w-[60px]"
        >
          <LogOut className="h-5 w-5 text-white/25" />
          <span className="text-[10px] font-medium text-white/25">Out</span>
        </button>
      </div>
    </nav>
  )
}
