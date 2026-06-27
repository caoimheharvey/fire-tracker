"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts"
import { format } from "date-fns"

interface SpendingMonth {
  month: string
  total_spend: number
}

export function SpendingChart({ data, targetMonthly }: { data: SpendingMonth[]; targetMonthly: number }) {
  const chartData = data.map(s => ({
    month: format(new Date(s.month + "T12:00:00"), "MMM yy"),
    spend: s.total_spend,
    overBudget: s.total_spend > targetMonthly,
  }))

  if (chartData.length === 0) {
    return <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData}>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, fontSize: 12 }}
          formatter={(v) => [`€${Number(v).toLocaleString()}`, "Spend"]}
        />
        <ReferenceLine y={targetMonthly} stroke="#52525b" strokeDasharray="4 4" label={{ value: "target", fill: "#71717a", fontSize: 10 }} />
        <Bar dataKey="spend" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.overBudget ? "#7f1d1d" : "#3f3f46"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
