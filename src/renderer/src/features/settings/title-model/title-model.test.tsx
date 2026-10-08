import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { TitleModel, type TitleModelProps } from "@/features/settings/title-model/title-model"

const MODELS = [
  { id: "deepseek/deepseek-v4-flash-0731", name: "DeepSeek V4 Flash (0731)" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
]

function props(overrides: Partial<TitleModelProps> = {}): TitleModelProps {
  return {
    models: MODELS,
    value: MODELS[0]!.id,
    error: null,
    onValueChange: () => undefined,
    ...overrides,
  }
}

describe("TitleModel", () => {
  it("can show the naming model picker", () => {
    render(<TitleModel {...props()} />)

    expect(screen.getByText("Chat naming")).not.toBeNull()
    expect(screen.getByLabelText("Naming model")).not.toBeNull()
  })

  it("can show an error when the choice could not be saved", () => {
    render(<TitleModel {...props({ error: "Pi is not ready." })} />)

    expect(screen.getByRole("alert").textContent).toBe("Pi is not ready.")
  })

  it("can hide the error while the choice is saved", () => {
    render(<TitleModel {...props()} />)

    expect(screen.queryByRole("alert")).toBeNull()
  })
})
