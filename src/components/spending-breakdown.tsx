"use client"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/fire"

interface SpendingMonth {
  month: string
  total_spend: number
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  is_income: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#10b981",
  Dining: "#f59e0b",
  Transport: "#3b82f6",
  Housing: "#8b5cf6",
  Utilities: "#06b6d4",
  Subscriptions: "#ec4899",
  Healthcare: "#ef4444",
  Clothing: "#f97316",
  Entertainment: "#a78bfa",
  Travel: "#14b8a6",
  Investments: "#22c55e",
  Income: "#6ee7b7",
  Transfers: "#64748b",
  Other: "#71717a",
  Uncategorised: "#52525b",
}

export function SpendingBreakdown({ months, targetMonthly }: { months: SpendingMonth[]; targetMonthly: number }) {
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.month ?? "")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedMonth) return
    setLoading(true)
    fetch(`/api/spending?month=${selectedMonth}`)
      .then(r => r.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [selectedMonth])

  const expenses = transactions.filter(t => !t.is_income)
  const income = transactions.filter(t => t.is_income)
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome = income.reduce((s, t) => s + t.amount, 0)
  const saved = totalIncome > 0 ? totalIncome - totalExpense : null

  const byCategory: Record<string, number> = {}
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount })
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      {/* Month selector */}
      <div className="flex gap-2 flex-wrap">
        {months.map(m => {
          const over = m.total_spend > targetMonthly
          const active = selectedMonth === m.month
          return (
            <button
              key={m.month}
              onClick={() => setSelectedMonth(m.month)}
              className="rounded-xl px-3.5 py-2 text-sm transition-all duration-200 flex items-center gap-2"
              style={{
                background: active ? (over ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? (over ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.18)") : "rgba(255,255,255,0.08)"}`,
                color: active ? "white" : "rgba(255,255,255,0.45)",
              }}
            >
              <span className="font-medium">{format(new Date(m.month + "T12:00:00"), "MMM yyyy")}</span>
              <span className={`text-xs ${over ? "text-red-400" : "text-white/35"}`}>
                {formatCurrency(m.total_spend)}
              </span>
            </button>
          )
        })}
        {months.length === 0 && (
          <p className="text-sm text-white/30">Upload bank statements to see your spending history.</p>
        )}
      </div>

      {selectedMonth && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: summary + categories */}
          <div className="space-y-4">
            {/* Summary tiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass glow-card rounded-2xl p-4">
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1">Total Spend</p>
                <p className={`text-xl font-bold ${totalExpense > targetMonthly ? "text-red-400" : "text-white"}`}>
                  {formatCurrency(totalExpense)}
                </p>
                <p className="text-xs text-white/30 mt-0.5">target: {formatCurrency(targetMonthly)}</p>
                {totalExpense > targetMonthly && (
                  <p className="text-xs text-red-400/80 mt-1">+{formatCurrency(totalExpense - targetMonthly)} over</p>
                )}
              </div>
              <div className="glass glow-card rounded-2xl p-4">
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1">Income</p>
                <p className="text-xl font-bold text-white">{totalIncome > 0 ? formatCurrency(totalIncome) : "—"}</p>
                {saved !== null && saved > 0 && (
                  <p className="text-xs text-emerald-400 mt-0.5">saved: {formatCurrency(saved)}</p>
                )}
                {saved !== null && saved <= 0 && (
                  <p className="text-xs text-red-400 mt-0.5">deficit: {formatCurrency(Math.abs(saved))}</p>
                )}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="glass glow-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">By Category</p>
              </div>
              {loading ? (
                <div className="p-5 text-xs text-white/30">Loading…</div>
              ) : sorted.length === 0 ? (
                <div className="p-5 text-xs text-white/30">No expenses this month</div>
              ) : (
                <div className="p-2 space-y-1">
                  {sorted.map(([cat, amount]) => {
                    const pct = (amount / totalExpense) * 100
                    const color = CATEGORY_COLORS[cat] ?? "#71717a"
                    return (
                      <div key={cat} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
                        <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-sm text-white/70 flex-1">{cat}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
                          </div>
                          <span className="text-sm font-medium text-white/70 w-20 text-right">{formatCurrency(amount)}</span>
                          <span className="text-xs text-white/30 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: transactions */}
          <div className="glass glow-card rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Transactions</p>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {loading ? (
                <div className="p-5 text-xs text-white/30">Loading…</div>
              ) : transactions.length === 0 ? (
                <div className="p-5 text-xs text-white/30">No transactions</div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {transactions.map(t => {
                    const color = CATEGORY_COLORS[t.category] ?? "#71717a"
                    return (
                      <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
                        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: t.is_income ? "#10b981" : color, opacity: 0.6 }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-white/65 truncate">{t.description}</p>
                          <p className="text-xs text-white/25">{t.date} · {t.category}</p>
                        </div>
                        <span className={`text-sm font-medium flex-shrink-0 ${t.is_income ? "text-emerald-400" : "text-white/70"}`}>
                          {t.is_income ? "+" : ""}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
