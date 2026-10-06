import ApplicationServices
import Foundation

@MainActor
final class ComputerSession {
  private var elements: [String: [Int: AXUIElement]] = [:]

  func handle(_ request: Request) async -> String {
    do {
      let result = try await dispatch(request)
      return okResponse(id: request.id, result: result)
    } catch let error as ComputerError {
      return errorResponse(id: request.id, message: error.description)
    } catch {
      return errorResponse(id: request.id, message: error.localizedDescription)
    }
  }

  private func dispatch(_ request: Request) async throws -> Any {
    switch request.method {
    case "permissions":
      return permissionResult()
    case "request_accessibility":
      _ = requestAccessibility()
      return permissionResult()
    case "request_screen_recording":
      _ = requestScreenRecording()
      return permissionResult()
    case "list_windows":
      return ["windows": listWindows()]
    case "snapshot":
      return try await snapshot(request.params)
    case "click":
      try await click(request.params)
      return ["ok": true]
    case "type_text":
      let pid = try requirePid(request.params)
      guard let text = jsonString(request.params["text"]) else {
        throw ComputerError("Missing text.")
      }
      try typeText(text, pid: pid)
      return ["ok": true]
    case "key":
      let pid = try requirePid(request.params)
      guard let key = jsonString(request.params["key"]) else {
        throw ComputerError("Missing key.")
      }
      try pressKey(key, pid: pid)
      return ["ok": true]
    case "scroll":
      let pid = try requirePid(request.params)
      let windowID = try requireWindow(request.params)
      let x = jsonDouble(request.params["x"]) ?? 0
      let y = jsonDouble(request.params["y"]) ?? 0
      let delta = jsonInt(request.params["delta_y"]) ?? -120
      try scrollWindow(pid: pid, windowID: windowID, x: x, y: y, deltaY: delta)
      return ["ok": true]
    default:
      throw ComputerError("Unknown method \(request.method).")
    }
  }

  private func snapshot(_ params: [String: Any]) async throws -> [String: Any] {
    let pid = try requirePid(params)
    let windowID = try requireWindow(params)
    let mode = jsonString(params["mode"]) ?? "som"
    var result: [String: Any] = [:]
    if mode == "ax" || mode == "som" {
      let tree = AxTree()
      let snap = try tree.snapshot(pid: pid, windowID: windowID)
      elements[cacheKey(pid, windowID)] = snap.elements
      result["markdown"] = snap.markdown
    }
    if mode == "vision" || mode == "som" {
      result["image"] = try await captureWindow(windowID)
    }
    if mode != "ax" && mode != "vision" && mode != "som" {
      throw ComputerError("Unknown snapshot mode \(mode).")
    }
    return result
  }

  private func click(_ params: [String: Any]) async throws {
    let pid = try requirePid(params)
    let windowID = try requireWindow(params)
    if let index = jsonInt(params["element_index"]) {
      let key = cacheKey(pid, windowID)
      if elements[key] == nil {
        let tree = AxTree()
        let snap = try tree.snapshot(pid: pid, windowID: windowID)
        elements[key] = snap.elements
      }
      guard let element = elements[key]?[index] else {
        throw ComputerError("Element \(index) is not in the latest snapshot.")
      }
      try pressElement(element)
      return
    }
    guard let x = jsonDouble(params["x"]), let y = jsonDouble(params["y"]) else {
      throw ComputerError("A click needs element_index or x and y.")
    }
    try await clickPoint(pid: pid, windowID: windowID, x: x, y: y)
  }

  private func requirePid(_ params: [String: Any]) throws -> Int32 {
    guard let pid = jsonInt(params["pid"]) else { throw ComputerError("Missing pid.") }
    return Int32(pid)
  }

  private func requireWindow(_ params: [String: Any]) throws -> UInt32 {
    guard let windowID = jsonInt(params["window_id"]) else { throw ComputerError("Missing window_id.") }
    return UInt32(windowID)
  }

  private func cacheKey(_ pid: Int32, _ windowID: UInt32) -> String {
    "\(pid):\(windowID)"
  }
}
