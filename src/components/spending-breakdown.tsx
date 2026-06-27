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

  const byCategory: Record<string, number> = {}
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount })
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex gap-2 flex-wrap">
        {months.map(m => (
          <button
            key={m.month}
            onClick={() => setSelectedMonth(m.month)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedMonth === m.month
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            } ${m.total_spend > targetMonthly ? "border border-red-900" : "border border-zinc-800"}`}
          >
            {format(new Date(m.month + "T12:00:00"), "MMM yyyy")}
            <span className="ml-2 text-xs text-zinc-500">{formatCurrency(m.total_spend)}</span>
          </button>
        ))}
      </div>

      {selectedMonth && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Summary */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="text-xs text-zinc-500">Total Spend</p>
                <p className={`text-xl font-bold ${totalExpense > targetMonthly ? "text-red-400" : "text-zinc-100"}`}>{formatCurrency(totalExpense)}</p>
                <p className="text-xs text-zinc-600">target: {formatCurrency(targetMonthly)}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="text-xs text-zinc-500">Income</p>
                <p className="text-xl font-bold text-zinc-100">{formatCurrency(totalIncome)}</p>
                <p className="text-xs text-zinc-600">
                  {totalIncome > 0 ? `saved: ${formatCurrency(Math.max(0, totalIncome - totalExpense))}` : "no income data"}
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">By Category</div>
              {loading ? (
                <div className="p-4 text-zinc-600 text-sm">Loading...</div>
              ) : sorted.length === 0 ? (
                <div className="p-4 text-zinc-600 text-sm">No expenses this month</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {sorted.map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-sm text-zinc-300">{cat}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-zinc-500"
                            style={{ width: `${Math.min((amount / totalExpense) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-300 w-20 text-right">{formatCurrency(amount)}</span>
                        <span className="text-xs text-zinc-600 w-8 text-right">{((amount / totalExpense) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Transactions</div>
            <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-zinc-600 text-sm">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="p-4 text-zinc-600 text-sm">No transactions</div>
              ) : (
                transactions.map(t => (
                  <div key={t.id} className="flex justify-between items-start px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate max-w-48">{t.description}</p>
                      <p className="text-xs text-zinc-600">{t.date} · {t.category}</p>
                    </div>
                    <span className={`text-sm font-medium ml-3 ${t.is_income ? "text-zinc-400" : "text-zinc-200"}`}>
                      {t.is_income ? "+" : ""}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
