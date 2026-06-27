export interface FireConfig {
  annual_expenses_target: number
  swr: number
  expected_return: number
  inflation_rate: number
  current_age: number
  target_retirement_age?: number
}

export interface FireProjection {
  fi_number: number
  years_to_fi_base: number
  years_to_fi_pessimistic: number
  years_to_fi_optimistic: number
  percent_to_fi: number
  projected_retirement_age_base: number
  on_track: boolean
}

export interface FireVariant {
  type: "Lean" | "Barista" | "Regular" | "Fat" | "Coast"
  label: string
  tagline: string
  annual_expenses: number
  fi_number: number
  years_to_fi: number        // pessimistic
  retirement_age: number     // pessimistic
  is_target: boolean         // matches user's configured amount
  already_achieved: boolean
  color: string
}

export function calculateFiNumber(config: Pick<FireConfig, "annual_expenses_target" | "swr">): number {
  return config.annual_expenses_target / config.swr
}

export function calculateYearsToFiWithTarget(
  currentNetWorth: number,
  annualSavings: number,
  targetFiNumber: number,
  returnRate: number
): number {
  if (currentNetWorth >= targetFiNumber) return 0
  if (annualSavings <= 0 && returnRate <= 0) return Infinity

  const r = returnRate
  if (r === 0) return Math.max(0, (targetFiNumber - currentNetWorth) / Math.max(annualSavings, 1))

  // Check if the target is even reachable — with positive return, wealth grows without limit,
  // but if savings are near zero and starting NW is tiny this can take centuries
  const maxYears = 200
  const projectedAtMax = currentNetWorth * Math.pow(1 + r, maxYears) + annualSavings * (Math.pow(1 + r, maxYears) - 1) / r
  if (projectedAtMax < targetFiNumber) return Infinity

  let lo = 0, hi = maxYears
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const projected = currentNetWorth * Math.pow(1 + r, mid) + annualSavings * (Math.pow(1 + r, mid) - 1) / r
    if (projected >= targetFiNumber) hi = mid
    else lo = mid
  }
  return hi
}

export function calculateYearsToFi(
  currentNetWorth: number,
  annualSavings: number,
  config: FireConfig,
  returnRate: number
): number {
  return calculateYearsToFiWithTarget(currentNetWorth, annualSavings, calculateFiNumber(config), returnRate)
}

// Coast FIRE: how much you need NOW so investments grow to FI number by target age, with zero contributions
export function coastFireNumber(fiNumber: number, returnRate: number, yearsToRetirement: number): number {
  if (yearsToRetirement <= 0) return fiNumber
  return fiNumber / Math.pow(1 + returnRate, yearsToRetirement)
}

export function project(
  currentNetWorth: number,
  annualSavings: number,
  config: FireConfig
): FireProjection {
  const fiNumber = calculateFiNumber(config)
  const percentToFi = Math.min((currentNetWorth / fiNumber) * 100, 100)

  const yearsBase = calculateYearsToFi(currentNetWorth, annualSavings, config, config.expected_return)
  const yearsP = calculateYearsToFi(currentNetWorth, annualSavings, config, Math.max(config.expected_return - 0.02, 0.01))
  const yearsO = calculateYearsToFi(currentNetWorth, annualSavings, config, config.expected_return + 0.01)

  const retirementAgeBase = config.current_age + yearsBase
  const onTrack = config.target_retirement_age
    ? retirementAgeBase <= config.target_retirement_age
    : yearsBase <= 20

  return {
    fi_number: fiNumber,
    years_to_fi_base: yearsBase,
    years_to_fi_pessimistic: yearsP,
    years_to_fi_optimistic: yearsO,
    percent_to_fi: percentToFi,
    projected_retirement_age_base: retirementAgeBase,
    on_track: onTrack,
  }
}

export function calculateFireVariants(
  currentNetWorth: number,
  annualSavings: number,
  config: FireConfig
): FireVariant[] {
  const r = Math.max(config.expected_return - 0.02, 0.01) // always pessimistic
  const targetExp = config.annual_expenses_target

  // Derive variant expense levels relative to user's target
  // Lean: lower of €20k or 55% of target (but at least €15k)
  const leanExp = Math.max(15000, Math.min(20000, Math.round(targetExp * 0.55 / 1000) * 1000))
  // Barista: 65% of target — enough to not fully rely on portfolio
  const baristaExp = Math.round(targetExp * 0.65 / 1000) * 1000
  // Regular: target as configured
  const regularExp = targetExp
  // Fat: 2x target, minimum €80k
  const fatExp = Math.max(80000, Math.round(targetExp * 2 / 1000) * 1000)

  const variants: Omit<FireVariant, "fi_number" | "years_to_fi" | "retirement_age" | "already_achieved">[] = [
    {
      type: "Lean",
      label: "Lean FIRE",
      tagline: "Bare essentials, maximum freedom",
      annual_expenses: leanExp,
      is_target: false,
      color: "from-slate-400 to-slate-500",
    },
    {
      type: "Barista",
      label: "Barista FIRE",
      tagline: "Semi-retired, part-time income covers the gap",
      annual_expenses: baristaExp,
      is_target: Math.abs(baristaExp - targetExp) < 2000,
      color: "from-teal-400 to-cyan-500",
    },
    {
      type: "Regular",
      label: "Regular FIRE",
      tagline: "Your configured target lifestyle",
      annual_expenses: regularExp,
      is_target: true,
      color: "from-violet-400 to-purple-500",
    },
    {
      type: "Fat",
      label: "Fat FIRE",
      tagline: "Comfortable with significant lifestyle margin",
      annual_expenses: fatExp,
      is_target: false,
      color: "from-amber-400 to-orange-500",
    },
    {
      type: "Coast",
      label: "Coast FIRE",
      tagline: "Stop contributing now, coast to retirement",
      annual_expenses: regularExp,
      is_target: false,
      color: "from-blue-400 to-indigo-500",
    },
  ]

  return variants.map(v => {
    if (v.type === "Coast") {
      const retirementAge = config.target_retirement_age ?? config.current_age + 30
      const yearsToRetirement = retirementAge - config.current_age
      const fiNum = calculateFiNumber({ annual_expenses_target: regularExp, swr: config.swr })
      const coastNum = coastFireNumber(fiNum, r, yearsToRetirement)
      const already = currentNetWorth >= coastNum
      return {
        ...v,
        fi_number: coastNum,
        years_to_fi: already ? 0 : calculateYearsToFiWithTarget(currentNetWorth, annualSavings, coastNum, r),
        retirement_age: already ? config.current_age : config.current_age + calculateYearsToFiWithTarget(currentNetWorth, annualSavings, coastNum, r),
        already_achieved: already,
      }
    }

    const fiNum = calculateFiNumber({ annual_expenses_target: v.annual_expenses, swr: config.swr })
    const years = calculateYearsToFiWithTarget(currentNetWorth, annualSavings, fiNum, r)
    return {
      ...v,
      fi_number: fiNum,
      years_to_fi: years,
      retirement_age: config.current_age + years,
      already_achieved: currentNetWorth >= fiNum,
    }
  })
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
