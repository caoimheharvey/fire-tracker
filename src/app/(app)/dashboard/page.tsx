import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateFiNumber, project, formatCurrency } from "@/lib/fire"
import { NetWorthChart } from "@/components/charts/net-worth-chart"
import { SpendingChart } from "@/components/charts/spending-chart"
import { GenerateReportButton } from "@/components/generate-report-button"

export default async function DashboardPage() {
  const session = await auth()
  const email = session!.user!.email!

  const [{ data: config }, { data: snapshots }, { data: spending }, { data: latestReport }] = await Promise.all([
    supabaseAdmin.from("fire_config").select("*").eq("user_email", email).single(),
    supabaseAdmin.from("net_worth_snapshots").select("*").eq("user_email", email).order("snapshot_month").limit(24),
    supabaseAdmin.from("spending_months").select("*").eq("user_email", email).order("month", { ascending: false }).limit(12),
    supabaseAdmin.from("fire_reports").select("*").eq("user_email", email).order("report_month", { ascending: false }).single(),
  ])

  if (!config) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-amber-300 text-sm">
          No FIRE configuration found. <a href="/fire" className="underline font-medium">Set your FIRE goals</a> to get started.
        </div>
      </div>
    )
  }

  const latestSnapshot = snapshots?.at(-1)
  const netWorth = latestSnapshot
    ? latestSnapshot.investment_value + latestSnapshot.cash_value + latestSnapshot.other_assets - latestSnapshot.total_liabilities
    : 0

  const monthlySpend = spending?.[0]?.total_spend ?? 0
  const avgMonthlyIncome = config.annual_expenses_target / 12 * 1.3 // rough estimate
  const annualSavings = Math.max(0, (avgMonthlyIncome - monthlySpend) * 12)
  const proj = project(netWorth, annualSavings, config)
  const fiNumber = calculateFiNumber(config)

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <GenerateReportButton />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrency(netWorth)}
          sub={`of ${formatCurrency(fiNumber)} FI target`}
          highlight={false}
        />
        <MetricCard
          label="FI Progress"
          value={`${proj.percent_to_fi.toFixed(1)}%`}
          sub="towards financial independence"
          highlight={proj.percent_to_fi >= 50}
        />
        <MetricCard
          label="Years to FI"
          value={proj.years_to_fi_pessimistic === Infinity ? "∞" : `${proj.years_to_fi_pessimistic.toFixed(1)} yrs`}
          sub="pessimistic estimate"
          highlight={false}
          warn={!proj.on_track}
        />
        <MetricCard
          label="This Month Spend"
          value={formatCurrency(monthlySpend)}
          sub={`target: ${formatCurrency(config.annual_expenses_target / 12)}/mo`}
          highlight={false}
          warn={monthlySpend > config.annual_expenses_target / 12}
        />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>0%</span>
          <span className="font-medium text-zinc-300">{proj.percent_to_fi.toFixed(1)}% to FI</span>
          <span>100%</span>
        </div>
        <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-zinc-500 to-zinc-300 transition-all"
            style={{ width: `${Math.min(proj.percent_to_fi, 100)}%` }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold mb-4 text-zinc-300">Net Worth History</h2>
          <NetWorthChart data={snapshots ?? []} fiNumber={fiNumber} />
        </div>
        <div className="rounded-lg border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold mb-4 text-zinc-300">Monthly Spend</h2>
          <SpendingChart data={(spending ?? []).slice().reverse()} targetMonthly={config.annual_expenses_target / 12} />
        </div>
      </div>

      {/* Latest report */}
      {latestReport && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300">Latest Assessment</h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <p className="text-sm leading-relaxed text-zinc-300">{latestReport.narrative}</p>
            <hr className="border-zinc-800" />
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Spending Critique</p>
              <p className="text-sm leading-relaxed text-zinc-400">{latestReport.spending_critique}</p>
            </div>
            <p className="text-xs text-zinc-600">Generated for {latestReport.report_month}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, highlight, warn }: {
  label: string; value: string; sub: string; highlight: boolean; warn?: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-1 ${warn ? "border-red-900 bg-red-950/20" : highlight ? "border-zinc-600 bg-zinc-900" : "border-zinc-800 bg-zinc-900/50"}`}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${warn ? "text-red-400" : "text-zinc-100"}`}>{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  )
}
