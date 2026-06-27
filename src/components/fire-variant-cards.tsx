"use client"
import { FireVariant, formatCurrency } from "@/lib/fire"

const FIRE_DESCRIPTIONS: Record<string, { detail: string; icon: string }> = {
  Lean: {
    icon: "⚡",
    detail: "Extreme frugality. Covers basics only — no luxuries, no margin for error. The math works on paper.",
  },
  Barista: {
    icon: "☕",
    detail: "Semi-retired with a small income covering ~35% of expenses. Requires part-time work indefinitely.",
  },
  Regular: {
    icon: "🎯",
    detail: "Your configured target. Full retirement at your chosen lifestyle level.",
  },
  Fat: {
    icon: "🏛",
    detail: "Retire with significant lifestyle cushion. Business class, renovations, no compromises.",
  },
  Coast: {
    icon: "🌊",
    detail: "Stop contributing today. Let compounding do the work. Still need income to cover living expenses until then.",
  },
}

interface Props {
  variants: FireVariant[]
  currentNetWorth: number
}

export function FireVariantCards({ variants, currentNetWorth }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 lg:grid-cols-3">
      {variants.map(v => {
        const info = FIRE_DESCRIPTIONS[v.type]
        const pct = Math.min((currentNetWorth / v.fi_number) * 100, 100)
        const achieved = v.already_achieved

        return (
          <div
            key={v.type}
            className={`relative glass glow-card rounded-2xl p-4 space-y-3 overflow-hidden transition-all duration-200 ${v.is_target ? "ring-1 ring-violet-500/30" : ""}`}
          >
            {/* Target badge */}
            {v.is_target && (
              <div className="absolute top-3 right-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.25)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}>
                  Your target
                </span>
              </div>
            )}

            {/* Achieved badge */}
            {achieved && (
              <div className="absolute top-3 right-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.2)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.25)" }}>
                  Achieved ✓
                </span>
              </div>
            )}

            {/* Gradient accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60"
              style={{ background: `linear-gradient(90deg, ${gradientColors[v.type]})` }}
            />

            <div className="space-y-0.5 pr-16">
              <div className="flex items-center gap-2">
                <span className="text-base">{info.icon}</span>
                <p className="text-sm font-semibold text-white/90">{v.label}</p>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">{info.detail}</p>
            </div>

            {/* FI number */}
            <div>
              <p className="text-lg font-bold text-white tracking-tight">{formatCurrency(v.fi_number)}</p>
              <p className="text-xs text-white/35">{formatCurrency(v.annual_expenses)}/yr spend</p>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="relative h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${gradientColors[v.type]})`,
                    opacity: achieved ? 1 : 0.7,
                  }}
                />
              </div>
              <p className="text-xs text-white/30">{pct.toFixed(0)}% funded</p>
            </div>

            {/* Timeline */}
            <div className="pt-1 border-t border-white/[0.06]">
              {achieved ? (
                <p className="text-xs font-medium text-emerald-400">Already there</p>
              ) : v.years_to_fi === Infinity ? (
                <p className="text-xs font-medium text-red-400">Savings rate too low</p>
              ) : (
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-white/80">
                    {v.years_to_fi.toFixed(1)} <span className="text-xs font-normal text-white/35">yrs</span>
                  </p>
                  <p className="text-xs text-white/35">age {v.retirement_age.toFixed(0)}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const gradientColors: Record<string, string> = {
  Lean: "#94a3b8, #64748b",
  Barista: "#2dd4bf, #0891b2",
  Regular: "#a78bfa, #818cf8",
  Fat: "#fbbf24, #f97316",
  Coast: "#60a5fa, #6366f1",
}
