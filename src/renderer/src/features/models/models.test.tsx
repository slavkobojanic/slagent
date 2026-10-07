import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Models, type ModelsProps } from "@/features/models/models"

function ListSlot() {
  return <p>Model list</p>
}

const defaults: ModelsProps = {
  open: true,
  query: "",
  overflowNotice: null,
  error: null,
  onOpenChange: () => undefined,
  onQueryChange: () => undefined,
  ModelList: ListSlot,
}

describe("Models", () => {
  it("renders nothing while closed", () => {
    render(<Models {...defaults} open={false} />)

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows the search and the model list", () => {
    render(<Models {...defaults} query="son" />)

    expect(screen.getByRole("dialog")).toBeDefined()
    expect(screen.getByDisplayValue("son")).toBeDefined()
    expect(screen.getByText("Model list")).toBeDefined()
  })

  it("notes when the OpenRouter results are cut short", () => {
    render(<Models {...defaults} overflowNotice="Showing 40 OpenRouter models. Refine the search to see more." />)

    expect(screen.getByText("Showing 40 OpenRouter models. Refine the search to see more.")).toBeDefined()
  })

  it("shows why the last change failed", () => {
    render(<Models {...defaults} error="Offline" />)

    expect(screen.getByRole("alert").textContent).toBe("Offline")
  })
})
