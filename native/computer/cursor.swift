import AppKit
import CoreGraphics

final class CursorOverlay: NSWindow {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

final class VirtualCursor: NSObject {
  static let shared = VirtualCursor()
  private let size: CGFloat = 22
  private var window: CursorOverlay?
  private var pending = CGPoint.zero

  func show(at quartzPoint: CGPoint) {
    pending = quartzPoint
    if Thread.isMainThread {
      renderPending()
      return
    }
    perform(#selector(renderPending), on: Thread.main, with: nil, waitUntilDone: true)
  }

  func hide() {
    if Thread.isMainThread {
      window?.orderOut(nil)
      return
    }
    perform(#selector(hideOnMain), on: Thread.main, with: nil, waitUntilDone: true)
  }

  @objc private func hideOnMain() {
    window?.orderOut(nil)
  }

  @objc private func renderPending() {
    let window = ensureWindow()
    let origin = appKitPoint(pending)
    window.setFrameOrigin(NSPoint(x: origin.x - size / 2, y: origin.y - size / 2))
    window.orderFrontRegardless()
  }

  private func ensureWindow() -> CursorOverlay {
    if let window { return window }
    let overlay = CursorOverlay(
      contentRect: NSRect(x: 0, y: 0, width: size, height: size),
      styleMask: .borderless,
      backing: .buffered,
      defer: false
    )
    overlay.isOpaque = false
    overlay.backgroundColor = .clear
    overlay.hasShadow = false
    overlay.ignoresMouseEvents = true
    overlay.level = .floating
    overlay.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]
    overlay.hidesOnDeactivate = false
    overlay.contentView = CursorMark(frame: NSRect(x: 0, y: 0, width: size, height: size))
    window = overlay
    return overlay
  }

  private func appKitPoint(_ point: CGPoint) -> NSPoint {
    let height = NSScreen.screens.map { $0.frame.maxY }.max() ?? 0
    return NSPoint(x: point.x, y: height - point.y)
  }
}

private final class CursorMark: NSView {
  override var isFlipped: Bool { true }

  override func draw(_ dirtyRect: NSRect) {
    let bounds = self.bounds.insetBy(dx: 2, dy: 2)
    NSColor.white.setFill()
    NSColor.black.setStroke()
    let dot = NSBezierPath(ovalIn: bounds)
    dot.lineWidth = 2
    dot.fill()
    dot.stroke()
    let arm = NSBezierPath()
    arm.move(to: NSPoint(x: bounds.midX, y: bounds.minY + 3))
    arm.line(to: NSPoint(x: bounds.midX, y: bounds.maxY - 3))
    arm.move(to: NSPoint(x: bounds.minX + 3, y: bounds.midY))
    arm.line(to: NSPoint(x: bounds.maxX - 3, y: bounds.midY))
    arm.lineWidth = 1.5
    arm.stroke()
  }
}
