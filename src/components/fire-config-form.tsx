"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/fire"

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
  const [editing, setEditing] = useState(!existing)

  if (!editing && existing) {
    return <FireConfigDisplay config={existing} onEdit={() => setEditing(true)} />
  }

  return (
    <FireConfigEditor
      existing={existing}
      onSaved={() => setEditing(false)}
    />
  )
}

function FireConfigDisplay({ config, onEdit }: { config: FireConfig; onEdit: () => void }) {
  const fiNumber = config.annual_expenses_target / config.swr

  const fields = [
    { label: "Annual spend in retirement", value: formatCurrency(config.annual_expenses_target) },
    { label: "Safe withdrawal rate", value: `${(config.swr * 100).toFixed(2)}%` },
    { label: "Expected real return", value: `${(config.expected_return * 100).toFixed(2)}%` },
    { label: "Assumed inflation", value: `${(config.inflation_rate * 100).toFixed(2)}%` },
    { label: "Current age", value: `${config.current_age}` },
    { label: "Target retirement age", value: config.target_retirement_age ? `${config.target_retirement_age}` : "Not set" },
  ]

  return (
    <div className="glass glow-card rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/70">Configuration</h2>
          <p className="text-xs text-white/35 mt-0.5">FI number: <span className="text-white/60 font-medium">{formatCurrency(fiNumber)}</span></p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-white/50 hover:text-white/80 transition-all"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {fields.map(f => (
          <div key={f.label}>
            <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-0.5">{f.label}</p>
            <p className="text-sm font-semibold text-white/80">{f.value}</p>
          </div>
        ))}
      </div>

      {config.notes && (
        <div className="pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-xs text-white/50 leading-relaxed">{config.notes}</p>
        </div>
      )}
    </div>
  )
}

function FireConfigEditor({ existing, onSaved }: { existing: FireConfig | null; onSaved: () => void }) {
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
      const res = await fetch("/api/fire/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const fiNumber = form.annual_expenses_target / form.swr

  return (
    <form onSubmit={save} className="glass glow-card rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">
          {existing ? "Edit Configuration" : "Set Up FIRE Goals"}
        </h2>
        <div className="text-right">
          <p className="text-xs text-white/35">FI number</p>
          <p className="text-base font-bold text-white">€{Math.round(fiNumber).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Annual spend in retirement" help="Your expected yearly expenses">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">€</span>
            <input type="number" value={form.annual_expenses_target} onChange={e => set("annual_expenses_target", Number(e.target.value))} className={inputCls + " pl-7"} required min={1} />
          </div>
        </Field>
        <Field label="Safe withdrawal rate" help="Pessimistic default: 3.5%">
          <div className="relative">
            <input type="number" value={(form.swr * 100).toFixed(2)} onChange={e => set("swr", Number(e.target.value) / 100)} className={inputCls + " pr-8"} step="0.01" min={1} max={10} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
        </Field>
        <Field label="Expected real return" help="After inflation — pessimistic: 5%">
          <div className="relative">
            <input type="number" value={(form.expected_return * 100).toFixed(2)} onChange={e => set("expected_return", Number(e.target.value) / 100)} className={inputCls + " pr-8"} step="0.1" min={0} max={20} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
        </Field>
        <Field label="Assumed inflation" help="Pessimistic default: 4%">
          <div className="relative">
            <input type="number" value={(form.inflation_rate * 100).toFixed(2)} onChange={e => set("inflation_rate", Number(e.target.value) / 100)} className={inputCls + " pr-8"} step="0.1" min={0} max={20} required />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span>
          </div>
        </Field>
        <Field label="Current age">
          <input type="number" value={form.current_age} onChange={e => set("current_age", Number(e.target.value))} className={inputCls} min={18} max={90} required />
        </Field>
        <Field label="Target retirement age" help="Optional">
          <input type="number" value={form.target_retirement_age ?? ""} onChange={e => set("target_retirement_age", e.target.value ? Number(e.target.value) : "")} className={inputCls} placeholder="—" min={18} max={90} />
        </Field>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/40 mb-1.5">Notes</label>
        <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} rows={2} placeholder="e.g. pension contributions, expected inheritance, property plans..." className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-all" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(59,130,246,0.5))", border: "1px solid rgba(255,255,255,0.12)" }}>
          {saving ? "Saving…" : "Save"}
        </button>
        {existing && (
          <button type="button" onClick={onSaved} className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/40 hover:text-white/60 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

const inputCls = "w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-white/20"

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="block text-xs font-medium text-white/50">{label}</label>
        {help && <span className="text-xs text-white/25">{help}</span>}
      </div>
      {children}
    </div>
  )
}
