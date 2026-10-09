import { describe, expect, it } from "vitest"
import { DAEMON_LABEL, daemonPlist } from "./daemon-launchd"

describe("daemonPlist", () => {
  const launch = {
    program: "/Applications/slagent.app/Contents/MacOS/slagent",
    args: ["/Applications/slagent.app/Contents/Resources/app.asar", "--daemon"],
    logPath: "/Users/s/Library/Application Support/slagent/daemon.log",
  }

  it("can point launchd at the headless app and keep it alive", () => {
    const plist = daemonPlist(launch)
    expect(plist).toContain(`<string>${DAEMON_LABEL}</string>`)
    expect(plist).toContain(`<string>${launch.program}</string>`)
    expect(plist).toContain("<string>--daemon</string>")
    expect(plist).toContain("<true/>")
    expect(plist).toContain(`<string>${launch.logPath}</string>`)
  })

  it("can escape paths so launchd reads the same file the app wrote", () => {
    const plist = daemonPlist({ ...launch, logPath: '/tmp/slagent & "log".log' })
    expect(plist).toContain('/tmp/slagent &amp; &quot;log&quot;.log')
  })

  it("can carry a marker so uninstalling never removes someone else's file", () => {
    expect(daemonPlist(launch)).toContain("Installed by slagent")
  })
})
