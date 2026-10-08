import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { About } from "./about"
import { AboutPresenter } from "./about-presenter/about-presenter"
import { AboutStore } from "./about-store/about-store"

export function createAbout({
  api,
  log,
}: {
  api: API
  log: Log
}): ComponentType {
  const aboutStore = new AboutStore()
  const aboutPresenter = new AboutPresenter(aboutStore, api, log)
  aboutPresenter.start()

  return observer(function AboutHost() {
    return (
      <About
        version={aboutStore.version}
        checking={aboutStore.checking}
        result={aboutStore.result}
        readyVersion={aboutStore.readyVersion}
        installing={aboutStore.installing}
        error={aboutStore.error}
        onCheck={aboutPresenter.handleCheck}
        onInstall={aboutPresenter.handleInstall}
      />
    )
  })
}