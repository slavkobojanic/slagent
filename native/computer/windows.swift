import CoreGraphics
import Foundation

struct ListedWindow {
  let pid: Int32
  let windowID: UInt32
  let app: String
  let title: String
  let x: Double
  let y: Double
  let width: Double
  let height: Double
  let onScreen: Bool
}

func listWindows() -> [[String: Any]] {
  guard let info = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else {
    return []
  }
  var windows: [[String: Any]] = []
  for item in info {
    guard let layer = jsonInt(item[kCGWindowLayer as String]), layer == 0 else { continue }
    guard let pid = jsonInt(item[kCGWindowOwnerPID as String]), pid > 0 else { continue }
    guard let windowID = jsonInt(item[kCGWindowNumber as String]), windowID > 0 else { continue }
    let bounds = item[kCGWindowBounds as String] as? [String: Any] ?? [:]
    let width = jsonDouble(bounds["Width"]) ?? 0
    let height = jsonDouble(bounds["Height"]) ?? 0
    if width < 80 && height < 80 { continue }
    let app = item[kCGWindowOwnerName as String] as? String ?? ""
    let title = item[kCGWindowName as String] as? String ?? ""
    let onScreen = item[kCGWindowIsOnscreen as String] as? Bool ?? false
    windows.append([
      "pid": pid,
      "window_id": windowID,
      "app": app,
      "title": title,
      "x": jsonDouble(bounds["X"]) ?? 0,
      "y": jsonDouble(bounds["Y"]) ?? 0,
      "width": width,
      "height": height,
      "on_screen": onScreen,
    ])
  }
  return windows
}

func windowFrame(pid: Int32, windowID: UInt32) -> CGRect? {
  for item in listWindows() {
    guard jsonInt(item["pid"]) == Int(pid) else { continue }
    guard jsonInt(item["window_id"]) == Int(windowID) else { continue }
    let x = jsonDouble(item["x"]) ?? 0
    let y = jsonDouble(item["y"]) ?? 0
    let width = jsonDouble(item["width"]) ?? 0
    let height = jsonDouble(item["height"]) ?? 0
    return CGRect(x: x, y: y, width: width, height: height)
  }
  return nil
}
