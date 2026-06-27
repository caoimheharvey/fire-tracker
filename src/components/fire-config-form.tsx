"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface FireConfig {
  annual_expenses_target: number
  swr: number
  expected_return: number
  inflation_rate: number
  current_age: number
  target_retirement_age?: number
  notes?: string
}

export function FireConfigForm({ existing }: { existing: FireConfig | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FireConfig>(existing ?? {
    annual_expenses_target: 40000,
    swr: 0.035,
    expected_return: 0.05,
    inflation_rate: 0.04,
    current_age: 30,
    target_retirement_age: undefined,
    notes: "",
  })

  function set(field: keyof FireConfig, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch("/api/fire/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-zinc-800 p-5 space-y-5">
      <h2 className="text-sm font-semibold text-zinc-300">Configuration</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Annual spend in retirement (€)" help="How much you'll actually spend/year">
          <input type="number" value={form.annual_expenses_target} onChange={e => set("annual_expenses_target", Number(e.target.value))} className={inputCls} required min={1} />
        </Field>
        <Field label="Safe withdrawal rate" help="Pessimistic default: 3.5%">
          <input type="number" value={(form.swr * 100).toFixed(2)} onChange={e => set("swr", Number(e.target.value) / 100)} className={inputCls} step="0.01" min={1} max={10} required />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
        </Field>
        <Field label="Expected real return" help="After inflation (pessimistic: 5%)">
          <input type="number" value={(form.expected_return * 100).toFixed(2)} onChange={e => set("expected_return", Number(e.target.value) / 100)} className={inputCls} step="0.1" min={0} max={20} required />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
        </Field>
        <Field label="Assumed inflation" help="Pessimistic default: 4%">
          <input type="number" value={(form.inflation_rate * 100).toFixed(2)} onChange={e => set("inflation_rate", Number(e.target.value) / 100)} className={inputCls} step="0.1" min={0} max={20} required />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
        </Field>
        <Field label="Current age">
          <input type="number" value={form.current_age} onChange={e => set("current_age", Number(e.target.value))} className={inputCls} min={18} max={90} required />
        </Field>
        <Field label="Target retirement age" help="Optional">
          <input type="number" value={form.target_retirement_age ?? ""} onChange={e => set("target_retirement_age", e.target.value ? Number(e.target.value) : "")} className={inputCls} min={18} max={90} />
        </Field>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
        <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500" />
      </div>
      <button type="submit" disabled={saving} className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors">
        {saving ? "Saving..." : "Save Configuration"}
      </button>
    </form>
  )
}

const inputCls = "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      {help && <p className="text-xs text-zinc-600">{help}</p>}
      <div className="relative">{children}</div>
    </div>
  )
}
