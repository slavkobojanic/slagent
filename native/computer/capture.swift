import CoreGraphics
import Foundation
import ImageIO
import ScreenCaptureKit
import UniformTypeIdentifiers

func captureWindow(_ windowID: UInt32) async throws -> String {
  guard screenRecordingAllowed() else {
    throw ComputerError("Screen recording is not allowed.")
  }
  let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
  guard let window = content.windows.first(where: { $0.windowID == windowID }) else {
    throw ComputerError("That window cannot be captured.")
  }
  let filter = SCContentFilter(desktopIndependentWindow: window)
  let config = SCStreamConfiguration()
  let scale = min(1, 1280 / max(window.frame.width, 1))
  config.width = max(1, Int(window.frame.width * scale))
  config.height = max(1, Int(window.frame.height * scale))
  config.showsCursor = false
  config.captureResolution = .best
  let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
  return try pngBase64(image)
}

private func pngBase64(_ image: CGImage) throws -> String {
  let data = NSMutableData()
  guard let destination = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else {
    throw ComputerError("Could not encode the window image.")
  }
  CGImageDestinationAddImage(destination, image, nil)
  if !CGImageDestinationFinalize(destination) {
    throw ComputerError("Could not encode the window image.")
  }
  return (data as Data).base64EncodedString()
}
