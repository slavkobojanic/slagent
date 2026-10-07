// Masks the raw square artwork (resources/icon.png) into the shape macOS
// expects. macOS never masks app icons itself, so the squircle with
// transparent margins must be baked into the source image.
//
// Follows Apple's Big Sur icon grid: an 824pt body (80.5% of the 1024pt
// canvas) centered with transparent margins, corner radius 185.4pt (22.5% of
// the body). Full-bleed tiles render visibly larger than every other Dock icon.
//
// Usage: swift round-icon.swift <input.png> <output.png> [bodyScale] [radiusFraction]
import Foundation
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count >= 3 else {
    FileHandle.standardError.write("usage: round-icon.swift <input.png> <output.png> [bodyScale] [radiusFraction]\n".data(using: .utf8)!)
    exit(1)
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let bodyScale = CommandLine.arguments.count > 3 ? Double(CommandLine.arguments[3])! : 0.8047
let radiusFraction = CommandLine.arguments.count > 4 ? Double(CommandLine.arguments[4])! : 0.225

guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    FileHandle.standardError.write("cannot read \(input.path)\n".data(using: .utf8)!)
    exit(1)
}

let side = image.width
let context = CGContext(
    data: nil, width: side, height: side,
    bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
)!

let body = CGFloat(bodyScale) * CGFloat(side)
let origin = (CGFloat(side) - body) / 2
let rect = CGRect(x: origin, y: origin, width: body, height: body)
let r = CGFloat(radiusFraction) * body
let path = CGPath(roundedRect: rect, cornerWidth: r, cornerHeight: r, transform: nil)
context.addPath(path)
context.clip()
context.draw(image, in: rect)

guard let masked = context.makeImage() else { exit(1) }
let dest = CGImageDestinationCreateWithURL(output as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(dest, masked, nil)
guard CGImageDestinationFinalize(dest) else {
    FileHandle.standardError.write("cannot write \(output.path)\n".data(using: .utf8)!)
    exit(1)
}
