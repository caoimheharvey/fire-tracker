import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { calculateFiNumber, project, formatCurrency } from "@/lib/fire"
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
    <div className="p-8 space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold">FIRE Goals</h1>

      <FireConfigForm existing={config} />

      {config && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Current Projections</h2>
          <ProjectionTable config={config} netWorth={netWorth} />
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Report History</h2>
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="rounded-lg border border-zinc-800 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.report_month}</span>
                  <span className="text-zinc-500">{r.percent_to_fi?.toFixed(1)}% to FI</span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-3">{r.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectionTable({ config, netWorth }: { config: Record<string, number>; netWorth: number }) {
  const scenarios = [
    { label: "Pessimistic", return: config.expected_return - 0.02, swr: config.swr },
    { label: "Base case", return: config.expected_return, swr: config.swr },
    { label: "Optimistic", return: config.expected_return + 0.01, swr: config.swr + 0.005 },
  ]

  const fiNumber = calculateFiNumber(config as unknown as Parameters<typeof calculateFiNumber>[0])

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Scenario</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Real Return</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">FI Number</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Years to FI</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Retire at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {scenarios.map((s, i) => {
            const proj = project(netWorth, 0, { ...(config as unknown as Parameters<typeof project>[2]), expected_return: s.return, swr: s.swr })
            return (
              <tr key={i} className={i === 0 ? "bg-zinc-900/30" : ""}>
                <td className="px-4 py-3 font-medium">{s.label}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{(s.return * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(fiNumber)}</td>
                <td className={`px-4 py-3 text-right font-medium ${i === 0 ? "text-red-400" : "text-zinc-300"}`}>
                  {proj.years_to_fi_base === Infinity ? "∞" : proj.years_to_fi_base.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-400">
                  {proj.years_to_fi_base === Infinity ? "—" : `age ${proj.projected_retirement_age_base.toFixed(0)}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
