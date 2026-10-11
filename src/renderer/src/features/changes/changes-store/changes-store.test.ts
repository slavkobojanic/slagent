import { describe, expect, it } from "vitest"
import { ChangesStore } from "./changes-store"
import { makeMeta, makeTranscript } from "@/features/changes/changes-fixtures"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelStore } from "@/state/panel/panel-store/panel-store"

function setup() {
  const panel = new PanelStore()
  const run = new RunStore()
  const meta = new MetaStore()
  const store = new ChangesStore(panel, run, meta)
  return { panel, run, meta, store }
}

describe("ChangesStore", () => {
  describe("plan", () => {
    it("can read the plan the run proposed", () => {
      const { run, store } = setup()
      run.setTranscript(makeTranscript({ planProposal: "1. Read the file" }))

      expect(store.plan).toBe("1. Read the file")
    })

    it("can read no plan when the proposal is empty", () => {
      const { run, store } = setup()
      run.setTranscript(makeTranscript({ planProposal: "" }))

      expect(store.plan).toBeNull()
    })
  })

  describe("hasPlan", () => {
    it("can be true when the run has a plan", () => {
      const { run, store } = setup()
      run.setTranscript(makeTranscript({ planProposal: "Plan" }))

      expect(store.hasPlan).toBe(true)
    })

    it("can be false when the run has no plan", () => {
      const { store } = setup()

      expect(store.hasPlan).toBe(false)
    })
  })

  describe("showing", () => {
    it("can show the changes tab by default", () => {
      const { store } = setup()

      expect(store.showing).toBe("changes")
    })

    it("can show the plan tab when the run has a plan", () => {
      const { panel, run, store } = setup()
      run.setTranscript(makeTranscript({ planProposal: "Plan" }))
      panel.setTab("plan")

      expect(store.showing).toBe("plan")
    })

    it("can fall back to the changes tab on the plan tab when there is no plan", () => {
      const { panel, store } = setup()
      panel.setTab("plan")

      expect(store.showing).toBe("changes")
    })
  })

  describe("changesShown", () => {
    it("can be false while the panel is closed", () => {
      const { store } = setup()

      expect(store.changesShown).toBe(false)
    })

    it("can be true while the panel is open on the changes tab", () => {
      const { panel, store } = setup()
      panel.setOpen(true)

      expect(store.changesShown).toBe(true)
    })
  })

  describe("hasFolder", () => {
    it("can be false before the app metadata arrives", () => {
      const { store } = setup()

      expect(store.hasFolder).toBe(false)
    })

    it("can be false when the folder path is empty", () => {
      const { meta, store } = setup()
      meta.setMeta(makeMeta(""))

      expect(store.hasFolder).toBe(false)
    })

    it("can be true once a folder is open", () => {
      const { meta, store } = setup()
      meta.setMeta(makeMeta("/work/app"))

      expect(store.hasFolder).toBe(true)
    })
  })
})
