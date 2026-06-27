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

export function calculateFiNumber(config: FireConfig): number {
  // FI number = annual expenses / SWR
  return config.annual_expenses_target / config.swr
}

export function calculateYearsToFi(
  currentNetWorth: number,
  annualSavings: number,
  config: FireConfig,
  returnRate: number
): number {
  const fiNumber = calculateFiNumber(config)
  if (currentNetWorth >= fiNumber) return 0

  // Geometric series: FI = NW*(1+r)^n + savings*((1+r)^n - 1)/r
  // Solve for n numerically
  if (annualSavings <= 0 && returnRate <= 0) return Infinity

  const r = returnRate
  const target = fiNumber
  const nw = currentNetWorth
  const s = annualSavings

  if (r === 0) {
    return (target - nw) / s
  }

  // Binary search
  let lo = 0, hi = 200
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const projected = nw * Math.pow(1 + r, mid) + s * (Math.pow(1 + r, mid) - 1) / r
    if (projected >= target) hi = mid
    else lo = mid
  }
  return hi
}

export function project(
  currentNetWorth: number,
  annualSavings: number,
  config: FireConfig
): FireProjection {
  const fiNumber = calculateFiNumber(config)
  const percentToFi = Math.min((currentNetWorth / fiNumber) * 100, 100)

  const yearsBase = calculateYearsToFi(currentNetWorth, annualSavings, config, config.expected_return)
  // Pessimistic: 1% lower returns, 1% higher inflation → 2% lower real return
  const yearsP = calculateYearsToFi(currentNetWorth, annualSavings, config, Math.max(config.expected_return - 0.02, 0.01))
  // Optimistic: 1% higher real return
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

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
