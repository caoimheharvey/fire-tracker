"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from "recharts"
import { format } from "date-fns"

interface Snapshot {
  snapshot_month: string
  investment_value: number
  cash_value: number
  other_assets: number
  total_liabilities: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-xl" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
      <p className="text-white/50 mb-1">{label}</p>
      <p className="text-white font-semibold">€{Number(payload[0]?.value ?? 0).toLocaleString()}</p>
    </div>
  )
}

export function NetWorthChart({ data, fiNumber }: { data: Snapshot[]; fiNumber: number }) {
  const chartData = data.map(s => ({
    month: format(new Date(s.snapshot_month + "T12:00:00"), "MMM yy"),
    netWorth: s.investment_value + s.cash_value + s.other_assets - s.total_liabilities,
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <p className="text-xs text-white/25">Upload IBKR screenshots to see history</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} width={48} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={fiNumber} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 3"
          label={{ value: "FI", fill: "rgba(255,255,255,0.3)", fontSize: 9, position: "insideTopRight" }} />
        <Area type="monotone" dataKey="netWorth" stroke="#7c3aed" strokeWidth={1.5} fill="url(#nwGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
