import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateFiNumber, project, formatCurrency, calculateFireVariants, FireConfig } from "@/lib/fire"
import { FireConfigForm } from "@/components/fire-config-form"

export default async function FirePage() {
  const session = await auth()
  const email = session!.user!.email!

  const [{ data: config }, { data: snapshotRows }, { data: reports }] = await Promise.all([
    supabaseAdmin.from("fire_config").select("*").eq("user_email", email).single(),
    supabaseAdmin.from("net_worth_snapshots").select("*").eq("user_email", email).order("snapshot_month", { ascending: false }).limit(1),
    supabaseAdmin.from("fire_reports").select("*").eq("user_email", email).order("report_month", { ascending: false }).limit(12),
  ])

  const latestSnapshot = snapshotRows?.[0] ?? null
  const netWorth = latestSnapshot
    ? (latestSnapshot.investment_value as number) + (latestSnapshot.cash_value as number) + (latestSnapshot.other_assets as number) - (latestSnapshot.total_liabilities as number)
    : 0

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">FIRE Goals</h1>
        <p className="text-sm text-white/40 mt-0.5">Configure your parameters. The projections will not flatter you.</p>
      </div>

      <FireConfigForm existing={config} />

      {config && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Scenario Analysis</h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <ProjectionTable config={config as unknown as FireConfig} netWorth={netWorth} />
        </div>
      )}

      {/* FIRE types explainer */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">FIRE Types Explained</h2>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <FireTypesExplainer config={config as unknown as FireConfig | null} netWorth={netWorth} />
      </div>

      {reports && reports.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Assessment History</h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="glass glow-card rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white/80 font-mono">{r.report_month}</span>
                  <span className="text-xs text-white/35">{r.percent_to_fi?.toFixed(1)}% to FI</span>
                </div>
                <p className="text-xs text-white/45 line-clamp-3 leading-relaxed">{r.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectionTable({ config, netWorth }: { config: FireConfig; netWorth: number }) {
  const scenarios = [
    { label: "Pessimistic", labelDetail: "-2% real return", return: Math.max(config.expected_return - 0.02, 0.01), swr: config.swr, accent: "text-red-400" },
    { label: "Base case", labelDetail: "as configured", return: config.expected_return, swr: config.swr, accent: "text-white/80" },
    { label: "Optimistic", labelDetail: "+1% real return", return: config.expected_return + 0.01, swr: config.swr + 0.005, accent: "text-emerald-400" },
  ]

  const fiNumber = calculateFiNumber(config)

  return (
    <div className="glass glow-card rounded-2xl overflow-hidden">
      <div className="grid grid-cols-5 px-5 py-3 border-b border-white/[0.06]">
        {["Scenario", "Real return", "FI number", "Years to FI", "Retire at"].map(h => (
          <p key={h} className="text-xs font-medium text-white/30 uppercase tracking-wider">{h}</p>
        ))}
      </div>
      {scenarios.map((s, i) => {
        const proj = project(netWorth, 0, { ...config, expected_return: s.return, swr: s.swr })
        return (
          <div key={i} className={`grid grid-cols-5 px-5 py-4 ${i < scenarios.length - 1 ? "border-b border-white/[0.05]" : ""} ${i === 0 ? "bg-red-500/[0.03]" : ""}`}>
            <div>
              <p className={`text-sm font-semibold ${s.accent}`}>{s.label}</p>
              <p className="text-xs text-white/25">{s.labelDetail}</p>
            </div>
            <p className="text-sm text-white/60 self-center">{(s.return * 100).toFixed(1)}%</p>
            <p className="text-sm text-white/60 self-center">{formatCurrency(fiNumber)}</p>
            <p className={`text-sm font-semibold self-center ${s.accent}`}>
              {proj.years_to_fi_base === Infinity ? "∞" : `${proj.years_to_fi_base.toFixed(1)} yrs`}
            </p>
            <p className="text-sm text-white/45 self-center">
              {proj.years_to_fi_base === Infinity ? "—" : `age ${proj.projected_retirement_age_base.toFixed(0)}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

const FIRE_TYPES = [
  {
    type: "Lean FIRE",
    icon: "⚡",
    color: "rgba(100,116,139,0.15)",
    border: "rgba(100,116,139,0.25)",
    tagline: "Frugality as a lifestyle",
    description: "Retire on the minimum required to cover bare essentials — food, shelter, basic transport, healthcare. Typically ~€15k–€25k/yr. Zero lifestyle inflation buffer. Any unexpected expense threatens the plan.",
    caveats: "Sequence-of-returns risk hits hardest here. One bad decade early in retirement and you're back to work.",
  },
  {
    type: "Barista FIRE",
    icon: "☕",
    color: "rgba(20,184,166,0.12)",
    border: "rgba(20,184,166,0.25)",
    tagline: "Semi-retired with a small income",
    description: "Accumulate enough that your portfolio covers ~60–70% of expenses. Work part-time (any job — not necessarily a barista) for the rest. Dramatically reduces your FI number and years to get there.",
    caveats: "Relies on your continued ability and willingness to work. Health issues, job market shifts, or lifestyle creep can break the model.",
  },
  {
    type: "Regular FIRE",
    icon: "🎯",
    color: "rgba(124,58,237,0.12)",
    border: "rgba(124,58,237,0.25)",
    tagline: "Full retirement at your target lifestyle",
    description: "The 'standard' FIRE goal. Your portfolio fully covers all expenses with no earned income. Usually targets a 3.5–4% withdrawal rate. Most people who talk about FIRE mean this.",
    caveats: "The 4% rule was derived from 30-year US market data. For longer retirements or non-US portfolios, 3–3.5% is more defensible.",
  },
  {
    type: "Fat FIRE",
    icon: "🏛",
    color: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    tagline: "Retire with significant surplus",
    description: "Typically €80k+ per year. Business class travel, private healthcare, renovations, generous gifting. Your portfolio has enough buffer that market downturns barely register as lifestyle threats.",
    caveats: "Requires an exceptionally high savings rate or unusually high income. For most people this is a multi-decade goal.",
  },
  {
    type: "Coast FIRE",
    icon: "🌊",
    color: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    tagline: "Stop contributing, let it compound",
    description: "Invest enough that — with no further contributions — compound growth alone reaches your FI number by retirement age. You still need to earn your living expenses, but you've 'won' the accumulation game.",
    caveats: "Highly sensitive to assumed return rate. At 5% real vs 7% real, the coast number can differ by 30–40%. Use a pessimistic rate.",
  },
]

function FireTypesExplainer({ config, netWorth }: { config: FireConfig | null; netWorth: number }) {
  const variants = config ? calculateFireVariants(netWorth, 0, config) : null

  return (
    <div className="space-y-3">
      {FIRE_TYPES.map(ft => {
        const variant = variants?.find(v => v.label === ft.type)
        return (
          <div
            key={ft.type}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: ft.color, border: `1px solid ${ft.border}`, backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{ft.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{ft.type}</p>
                  <p className="text-xs text-white/45">{ft.tagline}</p>
                </div>
              </div>
              {variant && (
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white/80">{formatCurrency(variant.fi_number)}</p>
                  <p className="text-xs text-white/35">
                    {variant.already_achieved
                      ? "✓ achieved"
                      : variant.years_to_fi === Infinity
                      ? "∞"
                      : `age ${variant.retirement_age.toFixed(0)}`}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-white/55 leading-relaxed">{ft.description}</p>
            <p className="text-xs text-white/35 leading-relaxed italic">{ft.caveats}</p>
          </div>
        )
      })}
    </div>
  )
}
