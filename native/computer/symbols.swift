import ApplicationServices
import CoreGraphics
import Foundation

typealias PostToPidFn = @convention(c) (Int32, UnsafeMutableRawPointer) -> Void
typealias SetIntFieldFn = @convention(c) (UnsafeMutableRawPointer, UInt32, Int64) -> Void
typealias PostRecordFn = @convention(c) (UnsafeRawPointer, UnsafePointer<UInt8>) -> Int32
typealias GetFrontFn = @convention(c) (UnsafeMutableRawPointer) -> Int32
typealias GetPsnFn = @convention(c) (Int32, UnsafeMutableRawPointer) -> Int32
typealias RemoteElementFn = @convention(c) (CFData) -> AXUIElement?
typealias WindowIDFn = @convention(c) (AXUIElement, UnsafeMutablePointer<UInt32>) -> Int32
typealias GetPidFn = @convention(c) (UnsafeRawPointer, UnsafeMutablePointer<Int32>) -> Int32

final class SystemSymbols: @unchecked Sendable {
  static let shared = SystemSymbols()

  let postToPid: PostToPidFn?
  let setIntField: SetIntFieldFn?
  let postRecord: PostRecordFn?
  let getFront: GetFrontFn?
  let getPsn: GetPsnFn?
  let remoteElement: RemoteElementFn?
  let windowID: WindowIDFn?
  let getPid: GetPidFn?

  private let handles: [UnsafeMutableRawPointer]

  private init() {
    let sky = dlopen("/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight", RTLD_LAZY)
    let ax = dlopen("/System/Library/Frameworks/ApplicationServices.framework/Frameworks/HIServices.framework/HIServices", RTLD_LAZY)
    handles = [sky, ax].compactMap { $0 }
    let opened = handles
    postToPid = Self.load("SLEventPostToPid", opened)
    setIntField = Self.load("SLEventSetIntegerValueField", opened)
    postRecord = Self.load("SLPSPostEventRecordTo", opened)
    getFront = Self.load("_SLPSGetFrontProcess", opened)
    getPsn = Self.load("GetProcessForPID", opened)
    remoteElement = Self.load("_AXUIElementCreateWithRemoteToken", opened)
    windowID = Self.load("_AXUIElementGetWindow", opened)
    getPid = Self.load("GetProcessPID", opened)
  }

  private static func load<T>(_ name: String, _ handles: [UnsafeMutableRawPointer]) -> T? {
    for handle in handles {
      if let symbol = dlsym(handle, name) {
        return unsafeBitCast(symbol, to: T.self)
      }
    }
    return nil
  }
}

func axWindowID(_ element: AXUIElement) -> UInt32? {
  guard let windowID = SystemSymbols.shared.windowID else { return nil }
  var value: UInt32 = 0
  let status = windowID(element, &value)
  if status != 0 || value == 0 { return nil }
  return value
}
