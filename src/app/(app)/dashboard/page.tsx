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

  const [{ data: config }, { data: snapshots }, { data: spending }, { data: latestReport }] = await Promise.all([
    supabaseAdmin.from("fire_config").select("*").eq("user_email", email).single(),
    supabaseAdmin.from("net_worth_snapshots").select("*").eq("user_email", email).order("snapshot_month").limit(24),
    supabaseAdmin.from("spending_months").select("*").eq("user_email", email).order("month", { ascending: false }).limit(12),
    supabaseAdmin.from("fire_reports").select("*").eq("user_email", email).order("report_month", { ascending: false }).single(),
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
          <a href="/fire" className="inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all duration-200" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
            Configure FIRE Goals →
          </a>
        </div>
      </div>
    )
  }

  const latestSnapshot = snapshots?.at(-1)
  const netWorth = latestSnapshot
    ? latestSnapshot.investment_value + latestSnapshot.cash_value + latestSnapshot.other_assets - latestSnapshot.total_liabilities
    : 0

  const latestSpend = spending?.[0]?.total_spend ?? 0
  const avgMonthlySpend = spending?.length
    ? spending.reduce((s, m) => s + m.total_spend, 0) / spending.length
    : 0
  const monthlyTarget = config.annual_expenses_target / 12
  const annualSavings = Math.max(0, (monthlyTarget * 1.35 - avgMonthlySpend) * 12)
  const proj = project(netWorth, annualSavings, config)
  const fiNumber = calculateFiNumber(config)
  const variants = calculateFireVariants(netWorth, annualSavings, config)
  const spendOverBudget = latestSpend > 0 && latestSpend > monthlyTarget
  const prevMonthSpend = spending?.[1]?.total_spend ?? 0
  const spendTrend = prevMonthSpend > 0 ? ((latestSpend - prevMonthSpend) / prevMonthSpend) * 100 : null

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
      <div className="glass glow-card-purple rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Financial Independence</p>
            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {proj.percent_to_fi.toFixed(1)}
              <span className="text-xl sm:text-2xl text-white/40 font-semibold">%</span>
            </p>
            <p className="text-xs sm:text-sm text-white/40 truncate">{formatCurrency(netWorth)} of {formatCurrency(fiNumber)}</p>
          </div>
          <div className="text-right space-y-1 flex-shrink-0">
            <p className="text-xs font-medium text-white/40 uppercase tracking-widest">Pessimistic ETA</p>
            <p className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
              {proj.years_to_fi_pessimistic === Infinity ? "∞" : proj.years_to_fi_pessimistic.toFixed(0)}
              <span className="text-sm sm:text-base text-white/40 font-normal ml-1">yrs</span>
            </p>
            <p className="text-xs text-white/35 max-w-[140px] sm:max-w-none leading-tight">
              {proj.years_to_fi_pessimistic === Infinity
                ? "savings rate insufficient"
                : `age ${(config.current_age + proj.years_to_fi_pessimistic).toFixed(0)} · base ${(config.current_age + proj.years_to_fi_base).toFixed(0)}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(proj.percent_to_fi, 100)}%`,
                background: "linear-gradient(90deg, #7c3aed, #6366f1, #38bdf8)",
                boxShadow: "0 0 10px rgba(139,92,246,0.6), 0 0 20px rgba(139,92,246,0.3)",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/25">
            <span>€0</span>
            <span>{formatCurrency(fiNumber)} at {(config.swr * 100).toFixed(1)}% SWR</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MetricCard label="Net Worth" value={formatCurrency(netWorth)} detail="investments + cash" />
        <MetricCard
          label="This Month"
          value={formatCurrency(latestSpend)}
          detail={`target: ${formatCurrency(monthlyTarget)}`}
          warn={spendOverBudget}
          badge={spendTrend !== null ? `${spendTrend > 0 ? "+" : ""}${spendTrend.toFixed(0)}% vs last` : undefined}
          badgeWarn={spendTrend !== null && spendTrend > 5}
        />
        <MetricCard
          label="Years to FI"
          value={proj.years_to_fi_base === Infinity ? "∞" : proj.years_to_fi_base.toFixed(1)}
          detail={`pessimistic: ${proj.years_to_fi_pessimistic === Infinity ? "∞" : proj.years_to_fi_pessimistic.toFixed(1)} yrs`}
          warn={!proj.on_track}
        />
        <MetricCard label="FI Number" value={formatCurrency(fiNumber)} detail={`at ${(config.swr * 100).toFixed(1)}% SWR`} />
      </div>

      {/* FIRE Pathways */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">FIRE Pathways</h2>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs text-white/25">all figures pessimistic</span>
        </div>
        <FireVariantCards variants={variants} currentNetWorth={netWorth} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="glass glow-card rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Net Worth History</p>
          <NetWorthChart data={snapshots ?? []} fiNumber={fiNumber} />
        </div>
        <div className="glass glow-card rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Monthly Spend</p>
          <SpendingChart data={(spending ?? []).slice().reverse()} targetMonthly={monthlyTarget} />
        </div>
      </div>

      {/* AI Assessment */}
      {latestReport && (
        <div className="glass glow-card rounded-2xl p-6 space-y-4">
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

function MetricCard({ label, value, detail, warn, badge, badgeWarn }: {
  label: string; value: string; detail: string; warn?: boolean; badge?: string; badgeWarn?: boolean
}) {
  return (
    <div className={`glass glow-card rounded-2xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 transition-colors ${warn ? "border-red-500/20" : ""}`}
      style={warn ? { background: "rgba(239,68,68,0.04)" } : {}}>
      <p className="text-[10px] sm:text-xs font-medium text-white/35 uppercase tracking-widest leading-tight">{label}</p>
      <p className={`text-lg sm:text-xl font-bold tracking-tight ${warn ? "text-red-400" : "text-white"}`}>{value}</p>
      <div className="flex items-start gap-1 min-h-[14px] flex-wrap">
        <p className="text-[10px] sm:text-xs text-white/28 flex-1 leading-tight">{detail}</p>
        {badge && (
          <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${badgeWarn ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
