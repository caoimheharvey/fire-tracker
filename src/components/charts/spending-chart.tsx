"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts"
import { format } from "date-fns"

interface SpendingMonth {
  month: string
  total_spend: number
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

export function SpendingChart({ data, targetMonthly }: { data: SpendingMonth[]; targetMonthly: number }) {
  const chartData = data.map(s => ({
    month: format(new Date(s.month + "T12:00:00"), "MMM yy"),
    spend: s.total_spend,
    over: s.total_spend > targetMonthly,
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <p className="text-xs text-white/25">Upload bank statements to see history</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barCategoryGap="35%">
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} width={48} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={targetMonthly} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3"
          label={{ value: "target", fill: "rgba(255,255,255,0.3)", fontSize: 9, position: "insideTopRight" }} />
        <Bar dataKey="spend" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.over ? "rgba(239,68,68,0.55)" : "rgba(139,92,246,0.45)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
