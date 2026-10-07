import AppKit
import ApplicationServices
import Foundation

// Some apps activate themselves when they are launched, opened with a URL, or
// handed an accessibility action (Chrome, Electron, Safari, Calculator). While a
// lease is open, any such activation is reverted by re-activating the app the
// person was using. Leases expire on their own so a leak cannot fight the user.
final class FocusStealGuard: @unchecked Sendable {
  static let shared = FocusStealGuard()

  private struct Entry {
    let target: pid_t?
    let bundle: String?
    let restore: pid_t
    let deadline: Date
  }

  private let lock = NSLock()
  private var entries: [UUID: Entry] = [:]
  private let queue = OperationQueue()

  private init() {
    queue.maxConcurrentOperationCount = 1
    NSWorkspace.shared.notificationCenter.addObserver(
      forName: NSWorkspace.didActivateApplicationNotification,
      object: nil,
      queue: queue
    ) { [weak self] note in
      guard let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else { return }
      self?.activated(app)
    }
  }

  // A lease matches the target pid, or any process of the bundle for launches
  // whose pid is not known yet. Other activations are the person's own.
  func begin(target: pid_t?, bundle: String? = nil, seconds: TimeInterval = 5) -> UUID? {
    guard let front = NSWorkspace.shared.frontmostApplication else { return nil }
    if let target, front.processIdentifier == target { return nil }
    if let bundle, front.bundleIdentifier == bundle { return nil }
    let id = UUID()
    lock.lock()
    entries[id] = Entry(
      target: target,
      bundle: bundle,
      restore: front.processIdentifier,
      deadline: Date().addingTimeInterval(seconds)
    )
    lock.unlock()
    return id
  }

  // Reflex activations can land shortly after the action returns, so the
  // lease outlives the call by a moment.
  func end(_ id: UUID?, after delay: TimeInterval = 0.5) {
    guard let id else { return }
    DispatchQueue.global().asyncAfter(deadline: .now() + delay) { [weak self] in
      guard let self else { return }
      self.lock.lock()
      self.entries.removeValue(forKey: id)
      self.lock.unlock()
    }
  }

  private func activated(_ app: NSRunningApplication) {
    let pid = app.processIdentifier
    let now = Date()
    lock.lock()
    entries = entries.filter { $0.value.deadline > now }
    let match = entries.values.first { entry in
      if pid == entry.restore { return false }
      if let target = entry.target, target == pid { return true }
      if let bundle = entry.bundle, bundle == app.bundleIdentifier { return true }
      return false
    }
    lock.unlock()
    guard let match else { return }
    restoreFront(match.restore, from: app)
  }
}

// Cooperative activation (macOS 14+) ignores activate() from a background
// process, so the person's app is raised over Accessibility instead, or
// activated on behalf of the app that just took focus.
private func restoreFront(_ pid: pid_t, from thief: NSRunningApplication) {
  let element = AXUIElementCreateApplication(pid)
  if AXUIElementSetAttributeValue(element, kAXFrontmostAttribute as CFString, kCFBooleanTrue) == .success {
    return
  }
  guard let app = NSRunningApplication(processIdentifier: pid) else { return }
  if !app.activate(from: thief, options: []) {
    app.activate(options: [])
  }
}

@MainActor
func withFocusGuard<T>(target: pid_t?, _ body: () async throws -> T) async rethrows -> T {
  let lease = FocusStealGuard.shared.begin(target: target)
  defer { FocusStealGuard.shared.end(lease) }
  return try await body()
}

@MainActor
func openInBackground(app name: String, url text: String?) async throws -> [String: Any] {
  guard let appURL = applicationURL(name) else {
    throw ComputerError("Could not find an app named \(name).")
  }
  let configuration = NSWorkspace.OpenConfiguration()
  configuration.activates = false
  configuration.addsToRecentItems = false
  let bundle = Bundle(url: appURL)?.bundleIdentifier
  let launching = bundle.map { NSRunningApplication.runningApplications(withBundleIdentifier: $0).isEmpty } ?? true
  // Cold launches raise their first window seconds after the call returns.
  let linger: TimeInterval = launching ? 8 : 2
  let lease = FocusStealGuard.shared.begin(target: nil, bundle: bundle, seconds: linger + 30)
  defer { FocusStealGuard.shared.end(lease, after: linger) }
  let running: NSRunningApplication
  if let text {
    guard let url = URL(string: text.contains("://") ? text : "https://\(text)") else {
      throw ComputerError("That URL is not valid.")
    }
    running = try await NSWorkspace.shared.open([url], withApplicationAt: appURL, configuration: configuration)
  } else {
    running = try await NSWorkspace.shared.openApplication(at: appURL, configuration: configuration)
  }
  try await sleep(milliseconds: 500)
  return ["pid": Int(running.processIdentifier), "app": running.localizedName ?? name]
}

private func applicationURL(_ name: String) -> URL? {
  let workspace = NSWorkspace.shared
  if let url = workspace.urlForApplication(withBundleIdentifier: name) { return url }
  let lowered = name.lowercased().replacingOccurrences(of: ".app", with: "")
  if let running = workspace.runningApplications.first(where: { $0.localizedName?.lowercased() == lowered }),
     let url = running.bundleURL {
    return url
  }
  let home = FileManager.default.homeDirectoryForCurrentUser.path
  let folders = ["/Applications", "/System/Applications", "/System/Applications/Utilities", "\(home)/Applications"]
  for folder in folders {
    guard let items = try? FileManager.default.contentsOfDirectory(atPath: folder) else { continue }
    if let match = items.first(where: { $0.lowercased() == "\(lowered).app" }) {
      return URL(fileURLWithPath: folder).appendingPathComponent(match)
    }
  }
  return nil
}
