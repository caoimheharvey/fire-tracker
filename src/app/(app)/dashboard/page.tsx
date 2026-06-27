import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateFiNumber, project, formatCurrency, calculateFireVariants } from "@/lib/fire"
import { NetWorthChart } from "@/components/charts/net-worth-chart"
import { SpendingChart } from "@/components/charts/spending-chart"
import { GenerateReportButton } from "@/components/generate-report-button"
import { FireVariantCards } from "@/components/fire-variant-cards"

export default async function DashboardPage() {
  const session = await auth()
  const email = session!.user!.email!

  const [
    { data: config },
    { data: snapshots },
    { data: spending },
    { data: latestReport },
    { data: recentIncome },
    { data: recentExpenses },
  ] = await Promise.all([
    supabaseAdmin.from("fire_config").select("*").eq("user_email", email).single(),
    supabaseAdmin.from("net_worth_snapshots").select("*").eq("user_email", email).order("snapshot_month").limit(24),
    supabaseAdmin.from("spending_months").select("*").eq("user_email", email).order("month", { ascending: false }).limit(12),
    supabaseAdmin.from("fire_reports").select("*").eq("user_email", email).order("report_month", { ascending: false }).single(),
    // Last 3 months of income transactions
    supabaseAdmin.from("transactions").select("amount, month").eq("user_email", email).eq("is_income", true).order("date", { ascending: false }).limit(200),
    // Last 3 months of expense transactions
    supabaseAdmin.from("transactions").select("amount, month, category").eq("user_email", email).eq("is_income", false).order("date", { ascending: false }).limit(500),
  ])

  if (!config) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[80vh]">
        <div className="glass glow-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">No configuration yet</h2>
          <p className="text-sm text-white/50">Set your FIRE goals to start tracking your progress.</p>
          <a href="/fire" className="inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
            Configure FIRE Goals →
          </a>
        </div>
      </div>
    )
  }

  // ── Net worth ──────────────────────────────────────────────────────────
  const latestSnapshot = snapshots?.at(-1)
  const netWorth = latestSnapshot
    ? latestSnapshot.investment_value + latestSnapshot.cash_value + latestSnapshot.other_assets - latestSnapshot.total_liabilities
    : 0
  const investmentValue = latestSnapshot?.investment_value ?? 0
  const investmentPct = netWorth > 0 ? (investmentValue / netWorth) * 100 : null

  // ── Income & spending (latest month with data) ─────────────────────────
  const latestSpendMonth = spending?.[0]?.month
  const latestSpend = spending?.[0]?.total_spend ?? 0
  const prevMonthSpend = spending?.[1]?.total_spend ?? 0
  const spendTrend = prevMonthSpend > 0 ? ((latestSpend - prevMonthSpend) / prevMonthSpend) * 100 : null
  const monthlyTarget = config.annual_expenses_target / 12
  const spendOverBudget = latestSpend > 0 && latestSpend > monthlyTarget

  // Income for the latest spend month
  const latestMonthIncome = latestSpendMonth
    ? (recentIncome ?? []).filter(t => t.month === latestSpendMonth).reduce((s, t) => s + t.amount, 0)
    : 0

  // 3-month rolling averages
  const last3months = spending?.slice(0, 3) ?? []
  const avgMonthlySpend = last3months.length
    ? last3months.reduce((s, m) => s + m.total_spend, 0) / last3months.length
    : 0

  const incomeByMonth: Record<string, number> = {}
  ;(recentIncome ?? []).forEach(t => {
    incomeByMonth[t.month] = (incomeByMonth[t.month] ?? 0) + t.amount
  })
  const incomeMonths = Object.values(incomeByMonth)
  const avgMonthlyIncome = incomeMonths.length
    ? incomeMonths.reduce((s, v) => s + v, 0) / incomeMonths.length
    : 0

  // Rates — only meaningful when we have income data
  const hasIncomeData = avgMonthlyIncome > 0
  const monthlySavings = hasIncomeData ? avgMonthlyIncome - avgMonthlySpend : null
  const savingsRate = hasIncomeData && avgMonthlyIncome > 0 ? Math.max(0, (avgMonthlyIncome - avgMonthlySpend) / avgMonthlyIncome) : null
  const spendingRate = hasIncomeData && avgMonthlyIncome > 0 ? Math.min(1, avgMonthlySpend / avgMonthlyIncome) : null

  // Investment category detection from expenses
  const investmentSpend = (recentExpenses ?? [])
    .filter(t => t.category === "Investments")
    .reduce((s, t) => s + t.amount, 0)
  const investmentRate = hasIncomeData && avgMonthlyIncome > 0 && incomeMonths.length > 0
    ? (investmentSpend / incomeMonths.length) / avgMonthlyIncome
    : null

  // Annual savings for projection
  const annualSavings = monthlySavings != null
    ? Math.max(0, monthlySavings * 12)
    : Math.max(0, (monthlyTarget * 1.35 - avgMonthlySpend) * 12)

  const proj = project(netWorth, annualSavings, config)
  const fiNumber = calculateFiNumber(config)
  const variants = calculateFireVariants(netWorth, annualSavings, config)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {proj.on_track
              ? "Roughly on track — but don't get comfortable."
              : "You are not on track for your target retirement age."}
          </p>
        </div>
        <GenerateReportButton />
      </div>

      {/* Hero: FI Progress */}
      <div className="glass glow-card-purple rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Financial Independence</p>
            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {proj.percent_to_fi.toFixed(1)}
              <span className="text-xl sm:text-2xl text-white/40 font-semibold">%</span>
            </p>
            <p className="text-xs sm:text-sm text-white/40">{formatCurrency(netWorth)} of {formatCurrency(fiNumber)}</p>
          </div>
          <div className="text-right space-y-1 flex-shrink-0">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Pessimistic ETA</p>
            <p className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
              {proj.years_to_fi_pessimistic === Infinity ? "∞" : proj.years_to_fi_pessimistic.toFixed(0)}
              <span className="text-sm sm:text-base text-white/40 font-normal ml-1">yrs</span>
            </p>
            <p className="text-xs text-white/35 max-w-[150px] sm:max-w-none leading-tight">
              {proj.years_to_fi_pessimistic === Infinity
                ? "savings rate too low"
                : `age ${(config.current_age + proj.years_to_fi_pessimistic).toFixed(0)} · base age ${(config.current_age + proj.years_to_fi_base).toFixed(0)}`}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(proj.percent_to_fi, 100)}%`, background: "linear-gradient(90deg, #7c3aed, #6366f1, #38bdf8)", boxShadow: "0 0 10px rgba(139,92,246,0.6)" }} />
          </div>
          <div className="flex justify-between text-xs text-white/25">
            <span>€0</span>
            <span>{formatCurrency(fiNumber)} at {(config.swr * 100).toFixed(1)}% SWR</span>
          </div>
        </div>
      </div>

      {/* Financial Snapshot */}
      <div className="space-y-3">
        <SectionHeader title="Financial Snapshot" sub={hasIncomeData ? "based on last 3 months" : "upload bank statements to see rates"} />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <SnapshotCard
            label="Monthly Income"
            value={avgMonthlyIncome > 0 ? formatCurrency(avgMonthlyIncome) : "—"}
            detail={latestMonthIncome > 0 ? `last month: ${formatCurrency(latestMonthIncome)}` : "no income data yet"}
            empty={avgMonthlyIncome === 0}
          />
          <SnapshotCard
            label="Monthly Spend"
            value={latestSpend > 0 ? formatCurrency(latestSpend) : "—"}
            detail={spendTrend !== null ? `${spendTrend > 0 ? "+" : ""}${spendTrend.toFixed(0)}% vs prev month` : `avg: ${formatCurrency(avgMonthlySpend)}`}
            warn={spendOverBudget}
            warnDetail={spendOverBudget ? `${formatCurrency(latestSpend - monthlyTarget)} over target` : undefined}
            empty={latestSpend === 0}
          />
          <SnapshotCard
            label="Savings Rate"
            value={savingsRate !== null ? `${(savingsRate * 100).toFixed(1)}%` : "—"}
            detail={monthlySavings !== null ? `${formatCurrency(monthlySavings)}/mo saved` : "needs income data"}
            warn={savingsRate !== null && savingsRate < 0.1}
            empty={savingsRate === null}
          />
          <SnapshotCard
            label="Spending Rate"
            value={spendingRate !== null ? `${(spendingRate * 100).toFixed(1)}%` : "—"}
            detail={spendingRate !== null
              ? spendingRate > 0.8 ? "dangerously high" : spendingRate > 0.6 ? "above target" : "reasonable"
              : "needs income data"}
            warn={spendingRate !== null && spendingRate > 0.7}
            empty={spendingRate === null}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <SnapshotCard
            label="Net Worth"
            value={formatCurrency(netWorth)}
            detail={`investments + cash`}
            empty={netWorth === 0}
          />
          <SnapshotCard
            label="Investments"
            value={formatCurrency(investmentValue)}
            detail={investmentPct !== null ? `${investmentPct.toFixed(0)}% of net worth` : "upload IBKR screenshot"}
            empty={investmentValue === 0}
          />
          <SnapshotCard
            label="Investment Rate"
            value={investmentRate !== null ? `${(investmentRate * 100).toFixed(1)}%` : "—"}
            detail="% of income going to investments"
            empty={investmentRate === null}
          />
          <SnapshotCard
            label="FI Number"
            value={formatCurrency(fiNumber)}
            detail={`at ${(config.swr * 100).toFixed(1)}% SWR · ${(config.expected_return * 100).toFixed(1)}% real return`}
          />
        </div>
      </div>

      {/* FIRE Retirement Ages */}
      <div className="space-y-3">
        <SectionHeader title="Retirement by FIRE Type" sub="pessimistic projections" />
        <FireVariantCards variants={variants} currentNetWorth={netWorth} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="glass glow-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Net Worth History</p>
          <NetWorthChart data={snapshots ?? []} fiNumber={fiNumber} />
        </div>
        <div className="glass glow-card rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Monthly Spend</p>
          <SpendingChart data={(spending ?? []).slice().reverse()} targetMonthly={monthlyTarget} />
        </div>
      </div>

      {/* AI Assessment */}
      {latestReport && (
        <div className="glass glow-card rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Monthly Assessment</p>
            <span className="text-xs text-white/20 font-mono">{latestReport.report_month}</span>
          </div>
          <p className="text-sm leading-relaxed text-white/65">{latestReport.narrative}</p>
          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Spending Critique</p>
            <p className="text-sm leading-relaxed text-white/50">{latestReport.spending_critique}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex-shrink-0">{title}</h2>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      <span className="text-xs text-white/25 flex-shrink-0">{sub}</span>
    </div>
  )
}

function SnapshotCard({ label, value, detail, warn, warnDetail, empty }: {
  label: string
  value: string
  detail: string
  warn?: boolean
  warnDetail?: string
  empty?: boolean
}) {
  return (
    <div
      className={`glass glow-card rounded-2xl p-3 sm:p-4 space-y-1.5 transition-colors ${warn ? "border-red-500/20" : ""}`}
      style={warn ? { background: "rgba(239,68,68,0.04)" } : {}}
    >
      <p className="text-[10px] sm:text-xs font-medium text-white/35 uppercase tracking-widest leading-tight">{label}</p>
      <p className={`text-lg sm:text-xl font-bold tracking-tight ${warn ? "text-red-400" : empty ? "text-white/25" : "text-white"}`}>
        {value}
      </p>
      <p className={`text-[10px] sm:text-xs leading-tight ${warnDetail ? "text-red-400/70" : "text-white/28"}`}>
        {warnDetail ?? detail}
      </p>
    </div>
  )
}
