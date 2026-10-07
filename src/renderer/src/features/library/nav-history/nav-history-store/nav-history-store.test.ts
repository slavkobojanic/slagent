import { describe, expect, it } from "vitest"
import { NAV_HISTORY_LIMIT, NavHistoryStore } from "@/features/library/nav-history/nav-history-store/nav-history-store"

function place(chatId: string | null, projectId = "p1") {
  return { projectId, chatId }
}

describe("NavHistoryStore", () => {
  describe("current", () => {
    it("can read null before any place is recorded", () => {
      expect(new NavHistoryStore().current).toBeNull()
    })

    it("can read the place the index points at", () => {
      const store = new NavHistoryStore()
      store.record(place("c1"))
      store.record(place("c2"))

      store.moveTo(0)

      expect(store.current).toEqual(place("c1"))
    })
  })

  describe("record", () => {
    it("can add a place after the current one and point at it", () => {
      const store = new NavHistoryStore()

      store.record(place("c1"))
      store.record(place("c2"))

      expect(store.entries).toEqual([place("c1"), place("c2")])
      expect(store.index).toBe(1)
    })

    it("can drop the places ahead of the index when a new place is visited", () => {
      const store = new NavHistoryStore()
      store.record(place("c1"))
      store.record(place("c2"))
      store.record(place("c3"))
      store.moveTo(0)

      store.record(place("c4"))

      expect(store.entries).toEqual([place("c1"), place("c4")])
      expect(store.index).toBe(1)
    })

    it("can keep only the most recent places", () => {
      const store = new NavHistoryStore()

      for (let count = 0; count < NAV_HISTORY_LIMIT + 5; count += 1) {
        store.record(place(`c${count}`))
      }

      expect(store.entries).toHaveLength(NAV_HISTORY_LIMIT)
      expect(store.entries[0]).toEqual(place("c5"))
    })
  })

  describe("replaceCurrent", () => {
    it("can swap the place the index points at", () => {
      const store = new NavHistoryStore()
      store.record(place(null))

      store.replaceCurrent(place("c9"))

      expect(store.entries).toEqual([place("c9")])
    })

    it("can do nothing when no place is current", () => {
      const store = new NavHistoryStore()

      store.replaceCurrent(place("c9"))

      expect(store.entries).toEqual([])
    })
  })

  describe("moveTo", () => {
    it("can point the index at a recorded place", () => {
      const store = new NavHistoryStore()
      store.record(place("c1"))
      store.record(place("c2"))

      store.moveTo(0)

      expect(store.index).toBe(0)
    })
  })

  describe("removeAt", () => {
    it("can drop a place before the index and move the index back with it", () => {
      const store = new NavHistoryStore()
      store.record(place("c1"))
      store.record(place("c2"))
      store.record(place("c3"))

      store.removeAt(0)

      expect(store.entries).toEqual([place("c2"), place("c3")])
      expect(store.current).toEqual(place("c3"))
    })

    it("can drop a place after the index without moving the index", () => {
      const store = new NavHistoryStore()
      store.record(place("c1"))
      store.record(place("c2"))
      store.record(place("c3"))
      store.moveTo(0)

      store.removeAt(2)

      expect(store.entries).toEqual([place("c1"), place("c2")])
      expect(store.index).toBe(0)
    })
  })

  describe("setPending", () => {
    it("can hold the place being opened and clear it again", () => {
      const store = new NavHistoryStore()

      store.setPending(place("c5"))
      expect(store.pending).toEqual(place("c5"))

      store.setPending(null)
      expect(store.pending).toBeNull()
    })
  })
})
