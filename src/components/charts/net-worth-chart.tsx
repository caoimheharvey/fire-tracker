"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts"
import { format } from "date-fns"

interface Snapshot {
  snapshot_month: string
  investment_value: number
  cash_value: number
  other_assets: number
  total_liabilities: number
}

export function NetWorthChart({ data, fiNumber }: { data: Snapshot[]; fiNumber: number }) {
  const chartData = data.map(s => ({
    month: format(new Date(s.snapshot_month + "T12:00:00"), "MMM yy"),
    netWorth: s.investment_value + s.cash_value + s.other_assets - s.total_liabilities,
  }))

  if (chartData.length === 0) {
    return <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 12 }}
          formatter={(v) => [`€${Number(v).toLocaleString()}`, "Net Worth"]}
        />
        <ReferenceLine y={fiNumber} stroke="#52525b" strokeDasharray="4 4" label={{ value: "FI", fill: "#71717a", fontSize: 10 }} />
        <Line type="monotone" dataKey="netWorth" stroke="#a1a1aa" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
