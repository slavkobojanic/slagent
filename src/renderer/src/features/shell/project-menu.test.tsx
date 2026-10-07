import { describe, expect, it } from "vitest"
import { ProjectMenu } from "@/features/shell/project-menu"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("ProjectMenu", () => {
  it("can label the trigger with the open project and show its folder as the tooltip", () => {
    const markup = viewMarkup(
      <ProjectMenu label="slagent" path="/work/slagent" projects={[]} onOpenProject={noop} onChooseFolder={noop} />,
    )

    expect(markup).toContain(">slagent</button>")
    expect(markup).toContain('title="/work/slagent"')
  })

  it("can label the trigger Choose folder when no project is open", () => {
    const markup = viewMarkup(
      <ProjectMenu label="Choose folder" path={undefined} projects={[]} onOpenProject={noop} onChooseFolder={noop} />,
    )

    expect(markup).toContain(">Choose folder</button>")
    expect(markup).not.toContain("title=")
  })
})
