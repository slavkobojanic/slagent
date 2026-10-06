import ApplicationServices
import CoreGraphics
import Foundation

func accessibilityAllowed() -> Bool {
  AXIsProcessTrusted()
}

func requestAccessibility() -> Bool {
  let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
  let options = [key: true] as CFDictionary
  return AXIsProcessTrustedWithOptions(options)
}

func screenRecordingAllowed() -> Bool {
  CGPreflightScreenCaptureAccess()
}

func requestScreenRecording() -> Bool {
  CGRequestScreenCaptureAccess()
}

func permissionResult() -> [String: Any] {
  [
    "accessibility": accessibilityAllowed(),
    "screenRecording": screenRecordingAllowed(),
  ]
}
