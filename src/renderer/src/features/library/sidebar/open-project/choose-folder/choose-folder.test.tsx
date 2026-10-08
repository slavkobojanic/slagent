import { describe, expect, it } from "vitest"
import { ChooseFolder } from "@/features/library/sidebar/open-project/choose-folder/choose-folder"
import { viewMarkup } from "@/test/view-markup"

describe("ChooseFolder", () => {
  it("can ask for a folder to start a project", () => {
    const html = viewMarkup(<ChooseFolder onChooseFolder={() => undefined} onNewChat={() => undefined} />)

    expect(html).toContain("Choose a folder to start a project")
    expect(html).toContain("Choose folder")
    expect(html).toContain("New chat")
  })
})
