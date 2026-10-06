import ApplicationServices
import CoreGraphics
import Foundation

private let maxDepth = 14
private let maxNodes = 500
private let remoteProbeLimit: UInt64 = 2_000

final class AxTree {
  private var nextIndex = 0
  private var nodes = 0
  var indexed: [Int: AXUIElement] = [:]
  private var enabledPids = Set<Int32>()

  func snapshot(pid: Int32, windowID: UInt32) throws -> (markdown: String, elements: [Int: AXUIElement]) {
    guard accessibilityAllowed() else {
      throw ComputerError("Accessibility is not allowed.")
    }
    nextIndex = 0
    nodes = 0
    indexed = [:]
    enableChromium(pid)
    let window = try resolveWindow(pid: pid, windowID: windowID)
    AXUIElementSetMessagingTimeout(window, 1)
    let body = walk(window, depth: 0)
    let title = stringAttribute(window, kAXTitleAttribute as String) ?? "Window"
    let markdown = "# \(title)\n\(body)"
    return (markdown, indexed)
  }

  private func enableChromium(_ pid: Int32) {
    if enabledPids.contains(pid) { return }
    let app = AXUIElementCreateApplication(pid)
    let manual = setBool(app, "AXManualAccessibility", true)
    if manual == .attributeUnsupported {
      _ = setBool(app, "AXEnhancedUserInterface", true)
    }
    if manual == .success || manual == .attributeUnsupported {
      enabledPids.insert(pid)
    }
    if manual == .success {
      CFRunLoopRunInMode(CFRunLoopMode.defaultMode, 0.4, false)
    }
  }

  private func resolveWindow(pid: Int32, windowID: UInt32) throws -> AXUIElement {
    let app = AXUIElementCreateApplication(pid)
    AXUIElementSetMessagingTimeout(app, 0.5)
    if let listed = findListedWindow(app, windowID: windowID) { return listed }
    if let remote = findRemoteWindow(pid: pid, windowID: windowID) { return remote }
    throw ComputerError("That window is not in the accessibility tree.")
  }

  private func findListedWindow(_ app: AXUIElement, windowID: UInt32) -> AXUIElement? {
    guard let windows = arrayAttribute(app, kAXWindowsAttribute as String) else { return nil }
    for item in windows {
      guard let window = axElement(item) else { continue }
      if axWindowID(window) == windowID { return window }
    }
    return nil
  }

  private func findRemoteWindow(pid: Int32, windowID: UInt32) -> AXUIElement? {
    guard let create = SystemSymbols.shared.remoteElement else { return nil }
    let started = Date()
    var elementID: UInt64 = 0
    while elementID < remoteProbeLimit {
      if Date().timeIntervalSince(started) > 0.3 { return nil }
      let token = remoteToken(pid: pid, elementID: elementID)
      elementID += 1
      guard let element = create(token as CFData) else { continue }
      AXUIElementSetMessagingTimeout(element, 0.05)
      let role = stringAttribute(element, kAXRoleAttribute as String)
      if role == kAXWindowRole as String && axWindowID(element) == windowID {
        AXUIElementSetMessagingTimeout(element, 1)
        return element
      }
    }
    return nil
  }

  private func walk(_ element: AXUIElement, depth: Int) -> String {
    if nodes >= maxNodes || depth > maxDepth { return "" }
    nodes += 1
    let role = stringAttribute(element, kAXRoleAttribute as String) ?? "AXUnknown"
    let title = stringAttribute(element, kAXTitleAttribute as String)
      ?? stringAttribute(element, kAXDescriptionAttribute as String)
    let value = stringAttribute(element, kAXValueAttribute as String)
    var line = String(repeating: "  ", count: depth) + "- "
    if let index = indexIfActionable(element, role: role) {
      indexed[index] = element
      line += "[\(index)] "
    }
    line += role
    if let title, !title.isEmpty { line += " \"\(singleLine(title))\"" }
    if let value, !value.isEmpty, value != title { line += " = \"\(singleLine(value))\"" }
    if let frame = frame(element) {
      let x = Int(frame.origin.x)
      let y = Int(frame.origin.y)
      let width = Int(frame.size.width)
      let height = Int(frame.size.height)
      line += " (\(x), \(y), \(width)x\(height))"
    }
    var text = line + "\n"
    guard let children = arrayAttribute(element, kAXChildrenAttribute as String) else { return text }
    for child in children {
      guard let element = axElement(child) else { continue }
      text += walk(element, depth: depth + 1)
    }
    return text
  }

  private func indexIfActionable(_ element: AXUIElement, role: String) -> Int? {
    let names = actionNames(element)
    let press = names.contains(kAXPressAction as String)
    let text = role == (kAXTextFieldRole as String) || role == (kAXTextAreaRole as String)
    if !press && !text { return nil }
    let index = nextIndex
    nextIndex += 1
    return index
  }

  private func actionNames(_ element: AXUIElement) -> Set<String> {
    var actions: CFArray?
    let error = AXUIElementCopyActionNames(element, &actions)
    if error != .success { return [] }
    guard let actions else { return [] }
    var names = Set<String>()
    for item in actions as NSArray {
      if let name = item as? String { names.insert(name) }
    }
    return names
  }

  private func frame(_ element: AXUIElement) -> CGRect? {
    guard let position = pointAttribute(element, kAXPositionAttribute as String) else { return nil }
    guard let size = sizeAttribute(element, kAXSizeAttribute as String) else { return nil }
    return CGRect(origin: position, size: size)
  }
}

func elementCenter(_ element: AXUIElement) -> CGPoint? {
  guard let position = pointAttribute(element, kAXPositionAttribute as String) else { return nil }
  guard let size = sizeAttribute(element, kAXSizeAttribute as String) else { return nil }
  return CGPoint(x: position.x + size.width / 2, y: position.y + size.height / 2)
}

private func remoteToken(pid: Int32, elementID: UInt64) -> Data {
  var data = Data(count: 20)
  data.withUnsafeMutableBytes { buffer in
    let bytes = buffer.bindMemory(to: UInt8.self).baseAddress!
    withUnsafeBytes(of: pid) { pidBytes in
      bytes.update(from: pidBytes.bindMemory(to: UInt8.self).baseAddress!, count: 4)
    }
    let magic: Int32 = 0x636F636F
    withUnsafeBytes(of: magic) { magicBytes in
      bytes.advanced(by: 8).update(from: magicBytes.bindMemory(to: UInt8.self).baseAddress!, count: 4)
    }
    withUnsafeBytes(of: elementID) { idBytes in
      bytes.advanced(by: 12).update(from: idBytes.bindMemory(to: UInt8.self).baseAddress!, count: 8)
    }
  }
  return data
}

private func setBool(_ element: AXUIElement, _ name: String, _ value: Bool) -> AXError {
  let flag: CFBoolean = value ? kCFBooleanTrue : kCFBooleanFalse
  return AXUIElementSetAttributeValue(element, name as CFString, flag)
}

private func stringAttribute(_ element: AXUIElement, _ name: String) -> String? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
  if error != .success { return nil }
  return value as? String
}

private func arrayAttribute(_ element: AXUIElement, _ name: String) -> [Any]? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
  if error != .success { return nil }
  return value as? [Any]
}

private func pointAttribute(_ element: AXUIElement, _ name: String) -> CGPoint? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
  if error != .success { return nil }
  guard let stored = value else { return nil }
  guard CFGetTypeID(stored) == AXValueGetTypeID() else { return nil }
  var point = CGPoint.zero
  if AXValueGetValue(stored as! AXValue, .cgPoint, &point) { return point }
  return nil
}

private func sizeAttribute(_ element: AXUIElement, _ name: String) -> CGSize? {
  var value: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, name as CFString, &value)
  if error != .success { return nil }
  guard let stored = value else { return nil }
  guard CFGetTypeID(stored) == AXValueGetTypeID() else { return nil }
  var size = CGSize.zero
  if AXValueGetValue(stored as! AXValue, .cgSize, &size) { return size }
  return nil
}

private func axElement(_ value: Any) -> AXUIElement? {
  let ref = value as CFTypeRef
  if CFGetTypeID(ref) != AXUIElementGetTypeID() { return nil }
  return (ref as! AXUIElement)
}

private func singleLine(_ text: String) -> String {
  text.replacingOccurrences(of: "\n", with: " ")
}

struct ComputerError: Error, CustomStringConvertible {
  let description: String
  init(_ description: String) {
    self.description = description
  }
}
