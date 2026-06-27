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
    <div className="p-8 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Spending</h1>
      <SpendingBreakdown months={months ?? []} targetMonthly={(config?.annual_expenses_target ?? 0) / 12} />
    </div>
  )
}
