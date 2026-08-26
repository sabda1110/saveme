/**
 * Financial Feasibility Calculator for Savings Goals & Group Savings
 */

export interface FeasibilityResult {
  isFeasible: boolean
  isTight: boolean // within 80%-100% capacity
  dailyRequired: number
  dailyCapacity: number
  deficitPerDay: number
  diffDays: number
  suggestedSafeDate: string
  suggestedSafeDays: number
  safeDailyRate: number
  advice: string
}

export function calculateSavingsFeasibility(
  targetAmount: number,
  targetDate: string | undefined,
  operatingCash: number,
  daysRemainingInMonth: number = 30,
  currentCommittedDaily: number = 0
): FeasibilityResult {
  const numTarget = Math.max(0, Number(targetAmount) || 0)
  const now = new Date()

  // 1. Calculate days until target date
  let diffDays = 30
  if (targetDate) {
    const targetD = new Date(targetDate)
    if (!isNaN(targetD.getTime())) {
      const diffMs = targetD.getTime() - now.getTime()
      diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }
  }

  // 2. Daily required for this specific goal
  const dailyRequired = numTarget > 0 ? Math.round(numTarget / diffDays) : 0

  // 3. User's daily cash capacity
  const rawDailyCapacity = Math.max(0, Math.round(operatingCash / Math.max(1, daysRemainingInMonth)))
  const availableDailyCapacity = Math.max(0, rawDailyCapacity - currentCommittedDaily)

  // 4. Feasibility checks
  const isDeficit = dailyRequired > availableDailyCapacity && dailyRequired > 0
  const isTight = !isDeficit && availableDailyCapacity > 0 && dailyRequired > availableDailyCapacity * 0.7
  const isFeasible = !isDeficit && !isTight

  const deficitPerDay = Math.max(0, dailyRequired - availableDailyCapacity)

  // 5. Calculate suggested safe date (allocating max 50% of available daily capacity for this goal)
  const safeDailyRate = availableDailyCapacity > 0
    ? Math.max(100, Math.round(availableDailyCapacity * 0.5))
    : Math.max(1000, Math.round(numTarget / 365))

  const suggestedSafeDays = numTarget > 0 ? Math.ceil(numTarget / safeDailyRate) : 30
  const suggestedDateObj = new Date(Date.now() + suggestedSafeDays * 24 * 60 * 60 * 1000)
  const suggestedSafeDate = suggestedDateObj.toISOString().split('T')[0]

  let advice = ''
  if (isDeficit) {
    advice = `Target ini menuntutmu menabung Rp ${dailyRequired.toLocaleString('id-ID')}/hari, melebihi sisa kapasitas kasmu (Rp ${availableDailyCapacity.toLocaleString('id-ID')}/hari). Defisit Rp ${deficitPerDay.toLocaleString('id-ID')}/hari.`
  } else if (isTight) {
    advice = `Target ini memakan sebagian besar kas harianmu (Rp ${dailyRequired.toLocaleString('id-ID')}/hari dari total Rp ${availableDailyCapacity.toLocaleString('id-ID')}/hari). Sisa uang belanja akan sangat pas-pasan.`
  } else {
    advice = `Target ini sangat realistis dan aman sesuai kapasitas kasmu (Rp ${dailyRequired.toLocaleString('id-ID')}/hari dari total Rp ${availableDailyCapacity.toLocaleString('id-ID')}/hari).`
  }

  return {
    isFeasible,
    isTight,
    dailyRequired,
    dailyCapacity: availableDailyCapacity,
    deficitPerDay,
    diffDays,
    suggestedSafeDate,
    suggestedSafeDays,
    safeDailyRate,
    advice,
  }
}
