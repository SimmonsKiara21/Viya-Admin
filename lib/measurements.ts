import type { StudentMeasurements } from "./types"

export function emptyMeasurements(): StudentMeasurements {
  return { height: "", bust: "", waist: "", hips: "", dress: "", shoe: "" }
}

export function normalizeMeasurements(raw?: Partial<StudentMeasurements> | null): StudentMeasurements {
  return {
    height: (raw?.height || "").trim(),
    bust: (raw?.bust || "").trim(),
    waist: (raw?.waist || "").trim(),
    hips: (raw?.hips || "").trim(),
    dress: (raw?.dress || "").trim(),
    shoe: (raw?.shoe || "").trim(),
  }
}

export function mergeMeasurements(
  keeper?: Partial<StudentMeasurements> | null,
  extra?: Partial<StudentMeasurements> | null,
): StudentMeasurements {
  const left = normalizeMeasurements(keeper)
  const right = normalizeMeasurements(extra)
  return {
    height: left.height || right.height,
    bust: left.bust || right.bust,
    waist: left.waist || right.waist,
    hips: left.hips || right.hips,
    dress: left.dress || right.dress,
    shoe: left.shoe || right.shoe,
  }
}
