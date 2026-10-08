import type { UsageDay } from "@shared/types"
import { describe, expect, it } from "vitest"
import { bucketFor, HEAT_DAYS, heatCells, usageLevels } from "./usage-grid"

describe("usageLevels", () => {
  it("can split active days into four quantile buckets", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8]
    const levels = usageLevels(values)

    expect(levels).toEqual([2, 4, 6])
    expect(bucketFor(1, levels)).toBe(1)
    expect(bucketFor(4, levels)).toBe(2)
    expect(bucketFor(6, levels)).toBe(3)
    expect(bucketFor(8, levels)).toBe(4)
  })

  it("can bucket zero and empty usage", () => {
    expect(bucketFor(0, usageLevels([]))).toBe(0)
    expect(usageLevels([])).toEqual([0, 0, 0])
  })

  it("can bucket a single active day", () => {
    const levels = usageLevels([10])

    expect(bucketFor(10, levels)).toBe(1)
    expect(bucketFor(11, levels)).toBe(4)
  })
})

describe("heatCells", () => {
  it("can build a 53 by 7 grid ending today", () => {
    const today = new Date(2026, 9, 8)
    const cells = heatCells([], "tokens", today)

    expect(cells).toHaveLength(HEAT_DAYS)
    expect(cells[HEAT_DAYS - 1]?.day).toBe("2026-10-08")
  })

  it("can place a day's usage in its local cell", () => {
    const today = new Date(2026, 9, 8)
    const days = usageDays([{ day: "2026-10-08", tokens: 5_000, cost: 0.4 }, { day: "2026-10-01", tokens: 500, cost: 0.04 }])
    const cells = heatCells(days, "tokens", today)

    expect(cells[HEAT_DAYS - 1]?.value).toBe(5_000)
    expect(cells[HEAT_DAYS - 1]?.level).toBeGreaterThan(0)
  })

  it("can re-bucket when the metric is dollars", () => {
    const today = new Date(2026, 9, 8)
    const days = usageDays([
      { day: "2026-10-08", tokens: 5_000, cost: 0.4 },
      { day: "2026-10-02", tokens: 3_000, cost: 3.0 },
      { day: "2026-10-01", tokens: 500, cost: 0.04 },
    ])
    const tokens = heatCells(days, "tokens", today)
    const dollars = heatCells(days, "dollars", today)

    expect(dollars[HEAT_DAYS - 1]?.value).toBe(0.4)
    // The same two days sit in different buckets under the other metric.
    const shared = "2026-10-02"
    expect(tokens.find((cell) => cell.day === shared)?.level).toBe(2)
    expect(dollars.find((cell) => cell.day === shared)?.level).toBe(4)
  })
})

function usageDays(days: { day: string; tokens: number; cost: number }[]): UsageDay[] {
  return days
}