import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { Nav } from "@/components/layout/nav"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-5 border-b border-zinc-800">
          <span className="text-sm font-semibold tracking-tight">FIRE Tracker</span>
        </div>
        <Nav
          onSignOut={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        />
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
