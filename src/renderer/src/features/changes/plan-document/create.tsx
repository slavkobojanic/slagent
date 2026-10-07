import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ChangesStore } from "@/features/changes/changes-store/changes-store"
import { PlanDocument } from "./plan-document"

export function createPlanDocument({ changesStore }: { changesStore: ChangesStore }): ComponentType {
  return observer(function PlanDocumentHost() {
    const plan = changesStore.plan
    if (plan === null) {
      return null
    }
    return <PlanDocument plan={plan} />
  })
}
