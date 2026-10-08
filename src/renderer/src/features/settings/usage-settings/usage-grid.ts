import type { UsageDay } from "@shared/types"

export type UsageMetric = "tokens" | "dollars"

export type UsageSortKey = "model" | "input" | "output" | "cache" | "cost" | "turns" | "share"

export type UsageSort = { key: UsageSortKey; dir: "asc" | "desc" }

// One heatmap cell. `level` 0-4, quantile-bucketed over active days.
export type HeatCell = {
  day: string
  value: number
  level: number
}

// 53 columns of 7 rows, ending today. 371 consecutive days always cover the
// last 365, and each grid row stays on one weekday.
export const HEAT_WEEKS = 53
export const HEAT_WEEKDAYS = 7
export const HEAT_DAYS = HEAT_WEEKS * HEAT_WEEKDAYS

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function heatCells(days: UsageDay[], metric: UsageMetric, today = new Date()): HeatCell[] {
  const byDay = new Map(days.map((day) => [day.day, day]))
  const levels = usageLevels(
    days.map((day) => (metric === "tokens" ? day.tokens : day.cost)).filter((value) => value > 0),
  )
  const cells: HeatCell[] = []
  for (let index = 0; index < HEAT_DAYS; index++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (HEAT_DAYS - 1 - index))
    const key = dayKey(date)
    const day = byDay.get(key)
    const value = day ? (metric === "tokens" ? day.tokens : day.cost) : 0
    cells.push({ day: key, value, level: bucketFor(value, levels) })
  }
  return cells
}

// The quantile thresholds that split active days into four intensities.
export function usageLevels(values: number[]): [number, number, number] {
  if (values.length === 0) return [0, 0, 0]
  const sorted = [...values].sort((a, b) => a - b)
  const quantile = (part: number): number => sorted[Math.floor(part * (sorted.length - 1))]!
  return [quantile(0.25), quantile(0.5), quantile(0.75)]
}

export function bucketFor(value: number, [low, middle, high]: [number, number, number]): number {
  if (value <= 0) return 0
  if (value <= low) return 1
  if (value <= middle) return 2
  if (value <= high) return 3
  return 4
}

export const HEAT_LEVEL_CLASSES = ["bg-white/5", "bg-success/25", "bg-success/50", "bg-success/70", "bg-success/90"] as const