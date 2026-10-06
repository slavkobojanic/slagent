import AppKit
import Foundation

@main
struct ComputerMain {
  static func main() {
    NSApplication.shared.setActivationPolicy(.accessory)
    let session = ComputerSession()
    DispatchQueue.global(qos: .userInitiated).async {
      while let line = readLine(strippingNewline: true) {
        if line.isEmpty { continue }
        let box = ResponseBox()
        let semaphore = DispatchSemaphore(value: 0)
        Task {
          let response: String
          if let request = parseRequest(line) {
            response = await session.handle(request)
          } else {
            response = errorResponse(id: "", message: "Could not read the request.")
          }
          box.value = response
          semaphore.signal()
        }
        semaphore.wait()
        print(box.value)
        fflush(stdout)
      }
      fflush(stdout)
      exit(0)
    }
    dispatchMain()
  }
}

private final class ResponseBox: @unchecked Sendable {
  var value = ""
}
