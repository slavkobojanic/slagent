// Masks the raw square artwork (resources/icon.png) into the rounded-square
// shape macOS expects. macOS never masks app icons itself, so the squircle
// with transparent corners must be baked into the source image.
//
// Usage: swift round-icon.swift <input.png> <output.png> [cornerRadius]
import Foundation
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count >= 3 else {
    FileHandle.standardError.write("usage: round-icon.swift <input.png> <output.png> [cornerRadius]\n".data(using: .utf8)!)
    exit(1)
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
// Apple's icon grid: 185.4pt radius on an 824pt body == 22.5% of the tile.
// The artwork is full-bleed, so radius is 22.5% of the full canvas.
let radius = CommandLine.arguments.count > 3 ? Double(CommandLine.arguments[3])! : 0.225

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

let r = CGFloat(radius) * CGFloat(side)
let rect = CGRect(x: 0, y: 0, width: side, height: side)
let path = CGPath(
    roundedRect: rect, cornerWidth: r, cornerHeight: r, transform: nil
)
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
