import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { SpendingBreakdown } from "@/components/spending-breakdown"

export default async function SpendingPage() {
  const session = await auth()
  const email = session!.user!.email!

  const [{ data: months }, { data: config }] = await Promise.all([
    supabaseAdmin.from("spending_months").select("*").eq("user_email", email).order("month", { ascending: false }).limit(12),
    supabaseAdmin.from("fire_config").select("annual_expenses_target").eq("user_email", email).single(),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Spending</h1>
        <p className="text-sm text-white/40 mt-0.5">Where your money is actually going.</p>
      </div>
      <SpendingBreakdown months={months ?? []} targetMonthly={(config?.annual_expenses_target ?? 0) / 12} />
    </div>
  )
}
