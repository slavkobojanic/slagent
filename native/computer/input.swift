import ApplicationServices
import CoreGraphics
import Foundation

func typeText(_ text: String, pid: Int32) throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  let source = CGEventSource(stateID: .hidSystemState)
  for character in text {
    postUnicode(character, pid: pid, source: source, down: true)
    postUnicode(character, pid: pid, source: source, down: false)
    usleep(8_000)
  }
}

func pressKey(_ name: String, pid: Int32) throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  guard let keycode = keycodes[name] else {
    throw ComputerError("Unknown key \(name).")
  }
  let source = CGEventSource(stateID: .hidSystemState)
  try postKeycode(keycode, pid: pid, source: source, down: true)
  try postKeycode(keycode, pid: pid, source: source, down: false)
}

func scrollWindow(pid: Int32, windowID: UInt32, x: Double, y: Double, deltaY: Int) throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  let source = CGEventSource(stateID: .hidSystemState)
  guard let event = CGEvent(
    scrollWheelEvent2Source: source,
    units: .pixel,
    wheelCount: 1,
    wheel1: Int32(deltaY),
    wheel2: 0,
    wheel3: 0
  ) else {
    throw ComputerError("Could not create a scroll event.")
  }
  event.location = CGPoint(x: x, y: y)
  stamp(event, pid: pid, windowID: windowID, clickState: 0, button: 0, phase: 0, group: clickGroup())
  deliver(event, pid: pid)
}

func clickPoint(pid: Int32, windowID: UInt32, x: Double, y: Double) async throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  let previous = frontProcess()
  _ = activateWithoutRaise(pid: pid, windowID: windowID)
  try await sleep(milliseconds: 50)
  let group = clickGroup()
  let source = CGEventSource(stateID: .hidSystemState)
  try postMouse(.mouseMoved, pid: pid, windowID: windowID, x: x, y: y, clickState: 0, phase: 2, group: group, source: source)
  try await sleep(milliseconds: 15)
  try postMouse(.leftMouseDown, pid: pid, windowID: windowID, x: -1, y: -1, clickState: 1, phase: 1, group: group, source: source)
  try postMouse(.leftMouseUp, pid: pid, windowID: windowID, x: -1, y: -1, clickState: 1, phase: 2, group: group, source: source)
  try await sleep(milliseconds: 15)
  try postMouse(.leftMouseDown, pid: pid, windowID: windowID, x: x, y: y, clickState: 1, phase: 3, group: group, source: source)
  try postMouse(.leftMouseUp, pid: pid, windowID: windowID, x: x, y: y, clickState: 1, phase: 3, group: group, source: source)
  try await sleep(milliseconds: 20)
  if let previous {
    _ = restoreFocus(previousPid: previous.pid, previousWindow: previous.windowID, targetPid: pid, targetWindow: windowID)
  }
}

private struct FrontProcess {
  let pid: Int32
  let windowID: UInt32
}

private func frontProcess() -> FrontProcess? {
  guard let getFront = SystemSymbols.shared.getFront else { return nil }
  var psn = (UInt32(0), UInt32(0))
  let status = withUnsafeMutableBytes(of: &psn) { buffer in
    getFront(buffer.baseAddress!)
  }
  if status != 0 { return nil }
  var pid: Int32 = 0
  guard let getPid = SystemSymbols.shared.getPid else { return nil }
  let pidStatus = withUnsafeBytes(of: psn) { buffer in
    getPid(buffer.baseAddress!, &pid)
  }
  if pidStatus != 0 || pid == 0 { return nil }
  let app = AXUIElementCreateApplication(pid)
  var value: CFTypeRef?
  AXUIElementCopyAttributeValue(app, kAXFocusedWindowAttribute as CFString, &value)
  guard let stored = value else { return nil }
  guard let window = axElementValue(stored) else { return nil }
  guard let windowID = axWindowID(window) else { return nil }
  return FrontProcess(pid: pid, windowID: windowID)
}

private func axElementValue(_ value: CFTypeRef) -> AXUIElement? {
  if CFGetTypeID(value) != AXUIElementGetTypeID() { return nil }
  return (value as! AXUIElement)
}

private func activateWithoutRaise(pid: Int32, windowID: UInt32) -> Bool {
  guard let post = SystemSymbols.shared.postRecord else { return false }
  guard let getFront = SystemSymbols.shared.getFront else { return false }
  guard let getPsn = SystemSymbols.shared.getPsn else { return false }
  var previous = (UInt32(0), UInt32(0))
  var target = (UInt32(0), UInt32(0))
  let previousOK = withUnsafeMutableBytes(of: &previous) { buffer in
    getFront(buffer.baseAddress!) == 0
  }
  let targetOK = withUnsafeMutableBytes(of: &target) { buffer in
    getPsn(pid, buffer.baseAddress!) == 0
  }
  if !previousOK || !targetOK { return false }
  var record = focusRecord(windowID)
  record[0x8A] = 0x02
  let defocus = withUnsafeBytes(of: previous) { buffer in
    record.withUnsafeBufferPointer { bytes in
      post(buffer.baseAddress!, bytes.baseAddress!) == 0
    }
  }
  record[0x8A] = 0x01
  let focus = withUnsafeBytes(of: target) { buffer in
    record.withUnsafeBufferPointer { bytes in
      post(buffer.baseAddress!, bytes.baseAddress!) == 0
    }
  }
  return defocus && focus
}

private func restoreFocus(previousPid: Int32, previousWindow: UInt32, targetPid: Int32, targetWindow: UInt32) -> Bool {
  guard let post = SystemSymbols.shared.postRecord else { return false }
  guard let getPsn = SystemSymbols.shared.getPsn else { return false }
  var previous = (UInt32(0), UInt32(0))
  var target = (UInt32(0), UInt32(0))
  let previousOK = withUnsafeMutableBytes(of: &previous) { getPsn(previousPid, $0.baseAddress!) == 0 }
  let targetOK = withUnsafeMutableBytes(of: &target) { getPsn(targetPid, $0.baseAddress!) == 0 }
  if !previousOK || !targetOK { return false }
  var record = focusRecord(targetWindow)
  record[0x8A] = 0x02
  let defocus = withUnsafeBytes(of: target) { psn in
    record.withUnsafeBufferPointer { bytes in
      post(psn.baseAddress!, bytes.baseAddress!) == 0
    }
  }
  record = focusRecord(previousWindow)
  record[0x8A] = 0x01
  let focus = withUnsafeBytes(of: previous) { psn in
    record.withUnsafeBufferPointer { bytes in
      post(psn.baseAddress!, bytes.baseAddress!) == 0
    }
  }
  return defocus && focus
}

private func focusRecord(_ windowID: UInt32) -> [UInt8] {
  var record = [UInt8](repeating: 0, count: 0xF8)
  record[0x04] = 0xF8
  record[0x08] = 0x0D
  let bytes = withUnsafeBytes(of: windowID.littleEndian) { Array($0) }
  record.replaceSubrange(0x3C..<0x40, with: bytes)
  return record
}

private func postMouse(
  _ type: CGEventType,
  pid: Int32,
  windowID: UInt32,
  x: Double,
  y: Double,
  clickState: Int64,
  phase: Int64,
  group: Int64,
  source: CGEventSource?
) throws {
  guard let event = CGEvent(
    mouseEventSource: source,
    mouseType: type,
    mouseCursorPosition: CGPoint(x: x, y: y),
    mouseButton: .left
  ) else {
    throw ComputerError("Could not create a mouse event.")
  }
  stamp(event, pid: pid, windowID: windowID, clickState: clickState, button: 0, phase: phase, group: group)
  deliver(event, pid: pid)
}

private func stamp(
  _ event: CGEvent,
  pid: Int32,
  windowID: UInt32,
  clickState: Int64,
  button: Int64,
  phase: Int64,
  group: Int64
) {
  guard let setField = SystemSymbols.shared.setIntField else { return }
  let pointer = Unmanaged.passUnretained(event).toOpaque()
  setField(pointer, 0, phase)
  setField(pointer, 1, clickState)
  setField(pointer, 3, button)
  setField(pointer, 7, 3)
  setField(pointer, 40, Int64(pid))
  setField(pointer, 51, Int64(windowID))
  setField(pointer, 58, group)
  setField(pointer, 91, Int64(windowID))
  setField(pointer, 92, Int64(windowID))
}

private func deliver(_ event: CGEvent, pid: Int32) {
  let pointer = Unmanaged.passUnretained(event).toOpaque()
  if let post = SystemSymbols.shared.postToPid {
    post(pid, pointer)
  }
  event.postToPid(pid)
}

private func postUnicode(_ character: Character, pid: Int32, source: CGEventSource?, down: Bool) {
  var units = Array(String(character).utf16)
  guard let event = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: down) else { return }
  event.keyboardSetUnicodeString(stringLength: units.count, unicodeString: &units)
  event.postToPid(pid)
}

private func postKeycode(_ keycode: CGKeyCode, pid: Int32, source: CGEventSource?, down: Bool) throws {
  guard let event = CGEvent(keyboardEventSource: source, virtualKey: keycode, keyDown: down) else {
    throw ComputerError("Could not create a key event.")
  }
  event.postToPid(pid)
}

private func clickGroup() -> Int64 {
  Int64(Date().timeIntervalSince1970 * 1000)
}

private func sleep(milliseconds: UInt64) async throws {
  try await Task.sleep(nanoseconds: milliseconds * 1_000_000)
}

private let keycodes: [String: CGKeyCode] = [
  "return": 36,
  "enter": 36,
  "tab": 48,
  "space": 49,
  "delete": 51,
  "backspace": 51,
  "escape": 53,
  "left": 123,
  "right": 124,
  "down": 125,
  "up": 126,
]
