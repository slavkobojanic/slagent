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
func clickPoint(pid: Int32, windowID: UInt32, x: Double, y: Double) async throws {
  guard accessibilityAllowed() else {
    throw ComputerError("Accessibility is not allowed.")
  }
  let point = CGPoint(x: x, y: y)
  VirtualCursor.shared.show(at: point)
  defer { VirtualCursor.shared.hide() }
  let source = eventSource()
  try preservingCursor {
    try postMouse(.mouseMoved, pid: pid, windowID: windowID, x: x, y: y, clickState: 0, phase: 0, group: 0, source: source, stamped: false)
    usleep(20_000)
    try postMouse(.leftMouseDown, pid: pid, windowID: windowID, x: x, y: y, clickState: 1, phase: 0, group: 0, source: source, stamped: false)
    usleep(30_000)
    try postMouse(.leftMouseUp, pid: pid, windowID: windowID, x: x, y: y, clickState: 1, phase: 0, group: 0, source: source, stamped: false)
  }
  try await sleep(milliseconds: 150)
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
  source: CGEventSource?,
  stamped: Bool
) throws {
  guard let event = CGEvent(
    mouseEventSource: source,
    mouseType: type,
    mouseCursorPosition: CGPoint(x: x, y: y),
    mouseButton: .left
  ) else {
    throw ComputerError("Could not create a mouse event.")
  }
  if stamped {
    stamp(event, pid: pid, windowID: windowID, clickState: clickState, button: 0, phase: phase, group: group)
  }
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
