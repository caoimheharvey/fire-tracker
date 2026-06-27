import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { Nav, MobileNav } from "@/components/layout/nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/")

  const signOutAction = async () => {
    "use server"
    await signOut({ redirectTo: "/" })
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="bg-mesh" />

      {/* Sidebar — desktop only */}
      <aside className="relative z-20 w-60 flex-shrink-0 flex-col hidden md:flex">
        <div
          className="absolute inset-0 border-r border-white/[0.07]"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
          }}
        />
        <div className="relative flex flex-col h-full">
          <div className="px-5 py-6 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
              >
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-white/90 tracking-tight">FIRE Tracker</span>
            </div>
          </div>
          <Nav onSignOut={signOutAction} />
        </div>
      </aside>

      {/* Main — extra bottom padding on mobile for tab bar */}
      <main className="relative z-10 flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom tab bar — mobile only */}
      <MobileNav onSignOut={signOutAction} />
    </div>
  )
}
