import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateFiNumber, project } from "@/lib/fire"
import { generateFireNarrative } from "@/lib/anthropic"
import { firstOfMonth } from "@/lib/utils"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const email = session.user.email
  const { month } = await req.json().catch(() => ({ month: firstOfMonth() }))
  const reportMonth = month ?? firstOfMonth()

  const [{ data: config }, { data: snapshots }, { data: spending }] = await Promise.all([
    supabaseAdmin.from("fire_config").select("*").eq("user_email", email).single(),
    supabaseAdmin.from("net_worth_snapshots").select("*").eq("user_email", email).order("snapshot_month", { ascending: false }).limit(12),
    supabaseAdmin.from("spending_months").select("*").eq("user_email", email).order("month", { ascending: false }).limit(6),
  ])

  if (!config) return NextResponse.json({ error: "No FIRE config set" }, { status: 400 })

  const latestSnapshot = snapshots?.[0]
  const netWorth = latestSnapshot
    ? latestSnapshot.investment_value + latestSnapshot.cash_value + latestSnapshot.other_assets - latestSnapshot.total_liabilities
    : 0

  const latestSpend = spending?.[0]?.total_spend ?? 0
  const avgMonthlySpend = spending?.length
    ? spending.reduce((s, m) => s + m.total_spend, 0) / spending.length
    : 0
  const annualSavingsEstimate = Math.max(0, config.annual_expenses_target - avgMonthlySpend * 12) * -1 // crude

  // Fetch top categories for this month
  const { data: topCats } = await supabaseAdmin
    .from("transactions")
    .select("category, amount")
    .eq("user_email", email)
    .eq("month", reportMonth)
    .eq("is_income", false)

  const catTotals: Record<string, number> = {}
  topCats?.forEach(t => { catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount })
  const topSpendCategories = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }))

  // Get income for savings rate
  const { data: incomeRows } = await supabaseAdmin
    .from("transactions")
    .select("amount")
    .eq("user_email", email)
    .eq("month", reportMonth)
    .eq("is_income", true)
  const monthlyIncome = incomeRows?.reduce((s, t) => s + t.amount, 0) ?? 0
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - latestSpend) / monthlyIncome) : 0

  const projection = project(netWorth, (monthlyIncome - latestSpend) * 12, config)
  const fiNumber = calculateFiNumber(config)

  const narrative = await generateFireNarrative({
    config,
    netWorth,
    fiNumber,
    percentToFi: projection.percent_to_fi,
    yearsToFiBase: projection.years_to_fi_base,
    yearsToFiPessimistic: projection.years_to_fi_pessimistic,
    monthlySpend: latestSpend,
    targetMonthlySpend: config.annual_expenses_target / 12,
    savingsRate,
    topSpendCategories,
    monthlySpendHistory: (spending ?? []).map(s => ({ month: s.month, total: s.total_spend })).reverse(),
  })

  const { data: report, error } = await supabaseAdmin
    .from("fire_reports")
    .upsert({
      user_email: email,
      report_month: reportMonth,
      fi_number: fiNumber,
      current_net_worth: netWorth,
      percent_to_fi: projection.percent_to_fi,
      years_to_fi_pessimistic: projection.years_to_fi_pessimistic,
      years_to_fi_base: projection.years_to_fi_base,
      monthly_savings_rate: savingsRate,
      narrative: narrative.narrative,
      spending_critique: narrative.spending_critique,
    }, { onConflict: "user_email,report_month" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(report)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { data } = await supabaseAdmin
    .from("fire_reports")
    .select("*")
    .eq("user_email", session.user.email)
    .order("report_month", { ascending: false })
    .limit(24)

  return NextResponse.json(data ?? [])
}
