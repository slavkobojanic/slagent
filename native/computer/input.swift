import ApplicationServices
import CoreGraphics
import Foundation
import ObjectiveC

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

func pressKey(_ name: String, modifiers: [String] = [], pid: Int32) throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  guard let keycode = keycodes[name.lowercased()] else {
    throw ComputerError("Unknown key \(name). Use one key name such as return, tab, escape, an arrow, f1-f12, or a single letter or digit, and pass modifiers separately. Use type for other characters.")
  }
  let flags = try modifierFlags(modifiers)
  let source = CGEventSource(stateID: .hidSystemState)
  try postKeycode(keycode, flags: flags, pid: pid, source: source, down: true)
  usleep(8_000)
  try postKeycode(keycode, flags: flags, pid: pid, source: source, down: false)
}

private func modifierFlags(_ names: [String]) throws -> CGEventFlags {
  var flags: CGEventFlags = []
  for name in names {
    switch name.lowercased() {
    case "cmd", "command": flags.insert(.maskCommand)
    case "shift": flags.insert(.maskShift)
    case "option", "alt": flags.insert(.maskAlternate)
    case "ctrl", "control": flags.insert(.maskControl)
    case "fn": flags.insert(.maskSecondaryFn)
    default: throw ComputerError("Unknown modifier \(name). Use cmd, shift, option, ctrl, or fn.")
    }
  }
  return flags
}

@MainActor
func scrollWindow(pid: Int32, windowID: UInt32, x: Double, y: Double, deltaY: Int) async throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  VirtualCursor.shared.show(at: CGPoint(x: x, y: y))
  defer { VirtualCursor.shared.hide() }
  let source = eventSource()
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
  preservingCursor {
    deliver(event, pid: pid)
  }
}

@MainActor
func pressElementVisibly(_ element: AXUIElement) async throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  if let center = elementCenter(element) {
    VirtualCursor.shared.show(at: center)
  }
  defer { VirtualCursor.shared.hide() }
  try pressElement(element)
  try await sleep(milliseconds: 150)
}

@MainActor
func clickPoint(pid: Int32, windowID: UInt32, x: Double, y: Double) async throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  VirtualCursor.shared.show(at: CGPoint(x: x, y: y))
  defer { VirtualCursor.shared.hide() }
  let previous = frontProcess()
  _ = activateWithoutRaise(pid: pid, windowID: windowID)
  try await sleep(milliseconds: 50)
  let group = clickGroup()
  let source = eventSource()
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
  try await sleep(milliseconds: 150)
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

private func eventSource() -> CGEventSource? {
  let source = CGEventSource(stateID: .hidSystemState)
  source?.localEventsSuppressionInterval = 0
  return source
}

private func preservingCursor(_ body: () throws -> Void) rethrows {
  let saved = CGEvent(source: nil)?.location ?? .zero
  CGAssociateMouseAndMouseCursorPosition(0)
  defer {
    CGWarpMouseCursorPosition(saved)
    CGAssociateMouseAndMouseCursorPosition(1)
  }
  try body()
}

private func postUnicode(_ character: Character, pid: Int32, source: CGEventSource?, down: Bool) {
  var units = Array(String(character).utf16)
  guard let event = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: down) else { return }
  event.keyboardSetUnicodeString(stringLength: units.count, unicodeString: &units)
  event.flags = []
  deliverKey(event, pid: pid)
}

private func postKeycode(_ keycode: CGKeyCode, flags: CGEventFlags, pid: Int32, source: CGEventSource?, down: Bool) throws {
  guard let event = CGEvent(keyboardEventSource: source, virtualKey: keycode, keyDown: down) else {
    throw ComputerError("Could not create a key event.")
  }
  event.flags = flags
  deliverKey(event, pid: pid)
}

// Chromium only accepts synthetic keys that arrive through SkyLight with an
// SLSEventAuthenticationMessage attached. Exactly one path posts, so a key is
// never delivered twice.
private func deliverKey(_ event: CGEvent, pid: Int32) {
  guard let post = SystemSymbols.shared.postToPid else {
    event.postToPid(pid)
    return
  }
  let pointer = Unmanaged.passUnretained(event).toOpaque()
  autoreleasepool {
    attachAuthentication(pointer, pid: pid)
  }
  post(pid, pointer)
}

private func attachAuthentication(_ event: UnsafeMutableRawPointer, pid: Int32) {
  let symbols = SystemSymbols.shared
  guard let setAuth = symbols.setAuthMessage, let send = symbols.msgSend else { return }
  guard let cls = NSClassFromString("SLSEventAuthenticationMessage") else { return }
  let selector = NSSelectorFromString("messageWithEventRecord:pid:version:")
  // The selector is missing on macOS 14. Calling it there crashes the helper.
  guard class_respondsToSelector(object_getClass(cls), selector) else { return }
  guard let record = eventRecord(event) else { return }
  let receiver = UnsafeRawPointer(Unmanaged.passUnretained(cls as AnyObject).toOpaque())
  let sel = UnsafeRawPointer(unsafeBitCast(selector, to: OpaquePointer.self))
  guard let message = send(receiver, sel, record, pid, 0) else { return }
  setAuth(event, message)
}

// __CGEvent is {CFRuntimeBase, uint32_t, SLSEventRecord *}. The record pointer
// sits at offset 24 on 64-bit; probe neighbours in case the layout shifts.
private func eventRecord(_ event: UnsafeMutableRawPointer) -> UnsafeMutableRawPointer? {
  for offset in [24, 32, 16] {
    if let record = event.load(fromByteOffset: offset, as: UnsafeMutableRawPointer?.self) {
      return record
    }
  }
  return nil
}

private func clickGroup() -> Int64 {
  Int64(Date().timeIntervalSince1970 * 1000)
}

func sleep(milliseconds: UInt64) async throws {
  try await Task.sleep(nanoseconds: milliseconds * 1_000_000)
}

private let keycodes: [String: CGKeyCode] = [
  "return": 36, "enter": 36, "tab": 48, "space": 49, "delete": 51, "backspace": 51,
  "escape": 53, "esc": 53, "forward_delete": 117, "home": 115, "end": 119,
  "pageup": 116, "pagedown": 121, "left": 123, "right": 124, "down": 125, "up": 126,
  "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97,
  "f7": 98, "f8": 100, "f9": 101, "f10": 109, "f11": 103, "f12": 111,
  "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9,
  "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17,
  "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26,
  "-": 27, "8": 28, "0": 29, "]": 30, "o": 31, "u": 32, "[": 33, "i": 34, "p": 35,
  "l": 37, "j": 38, "'": 39, "k": 40, ";": 41, "\\": 42, ",": 43, "/": 44,
  "n": 45, "m": 46, ".": 47, "`": 50,
]
