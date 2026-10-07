// The Select cannot hold null, so "Default" stands for it: the agent keeps its own behaviour.
export const DEFAULT = "default"

export function choice<T extends string>(value: string): T | null {
  if (value === DEFAULT) {
    return null
  }
  return value as T
}

export function triValue(value: string): boolean | null {
  if (value === "yes") {
    return true
  }
  if (value === "no") {
    return false
  }
  return null
}

export function tri(value: boolean | null): string | null {
  if (value === true) {
    return "yes"
  }
  if (value === false) {
    return "no"
  }
  return null
}
