// qrcode ships no types, and @types/qrcode pulls Node's globals into the renderer.
declare module "qrcode" {
  type QrModules = { size: number; get: (row: number, column: number) => number | boolean }
  const QRCode: {
    create: (text: string, options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }) => { modules: QrModules }
  }
  export default QRCode
}
