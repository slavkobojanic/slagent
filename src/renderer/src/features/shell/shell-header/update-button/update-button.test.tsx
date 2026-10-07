import { describe, expect, it } from "vitest"
import { UpdateButton } from "@/features/shell/shell-header/update-button/update-button"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("UpdateButton", () => {
  it("can offer the waiting update with its version", () => {
    const markup = viewMarkup(<UpdateButton version="1.2.0" installing={false} onInstall={noop} />)

    expect(markup).toContain("Update available (v1.2.0)")
    expect(markup).not.toContain('disabled=""')
  })

  it("can disable the update button while the update installs", () => {
    const markup = viewMarkup(<UpdateButton version="1.2.0" installing onInstall={noop} />)

    expect(markup).toContain('disabled=""')
  })

  it("can render nothing while no update is waiting", () => {
    const markup = viewMarkup(<UpdateButton version={null} installing={false} onInstall={noop} />)

    expect(markup).toBe("")
  })
})
