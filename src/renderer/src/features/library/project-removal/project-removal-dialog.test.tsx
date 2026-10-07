import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProjectRemovalDialog, type ProjectRemovalDialogProps } from "@/features/library/project-removal/project-removal-dialog"

const noop = () => undefined

const base: ProjectRemovalDialogProps = {
  open: true,
  projectName: "atlas",
  projectPath: "/work/atlas",
  typed: "",
  confirmed: false,
  busy: false,
  onTypedChange: noop,
  onCancel: noop,
  onConfirm: noop,
}

describe("ProjectRemovalDialog", () => {
  it("can show the folder and the name the user must type while open", () => {
    render(<ProjectRemovalDialog {...base} />)

    expect(screen.queryByRole("heading", { name: "Remove project" })).not.toBeNull()
    expect(screen.queryByText("/work/atlas")).not.toBeNull()
    expect(screen.queryByText("Type atlas to confirm")).not.toBeNull()
  })

  it("can keep the delete action disabled until the name is typed", () => {
    render(<ProjectRemovalDialog {...base} />)

    const action = screen.getByRole("button", { name: "Delete folder" })

    expect(action.hasAttribute("disabled")).toBe(true)
  })

  it("can enable the delete action once the name matches", () => {
    render(<ProjectRemovalDialog {...base} typed="atlas" confirmed />)

    const action = screen.getByRole("button", { name: "Delete folder" })

    expect(action.hasAttribute("disabled")).toBe(false)
  })

  it("can show the deleting label while the removal runs", () => {
    render(<ProjectRemovalDialog {...base} typed="atlas" confirmed busy />)

    expect(screen.queryByRole("button", { name: "Deleting" })).not.toBeNull()
  })

  it("can show nothing when closed", () => {
    render(<ProjectRemovalDialog {...base} open={false} />)

    expect(screen.queryByRole("heading", { name: "Remove project" })).toBeNull()
  })
})
