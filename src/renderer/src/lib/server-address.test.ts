import { describe, expect, it } from "vitest"
import { addressLabel, connectLink, parseServerAddress, rewriteAttachmentLinks, socketUrl } from "./server-address"

const server = { url: "ws://100.64.0.1:8747?token=abc", host: "100.64.0.1", port: 8747, token: "abc", tailscale: true }

describe("parseServerAddress", () => {
  it("can read the websocket address when it carries a token", () => {
    expect(parseServerAddress(" ws://100.64.0.1:8747?token=abc ")).toEqual({ host: "100.64.0.1", port: 8747, token: "abc" })
  })

  it("can read the connect link when the QR code is scanned", () => {
    expect(parseServerAddress(connectLink(server))).toEqual({ host: "100.64.0.1", port: 8747, token: "abc" })
  })

  it("can refuse an address when the token is missing", () => {
    expect(parseServerAddress("ws://100.64.0.1:8747")).toBeNull()
  })

  it("can refuse a link when the port is not a number", () => {
    expect(parseServerAddress("slagent://connect?host=a&port=x&token=t")).toBeNull()
  })

  it("can refuse text when it is not a url", () => {
    expect(parseServerAddress("hello")).toBeNull()
    expect(parseServerAddress("")).toBeNull()
  })

  it("can refuse a url when the scheme is not a server's", () => {
    expect(parseServerAddress("https://example.com/?token=abc")).toBeNull()
  })
})

describe("socketUrl", () => {
  it("can name the client when it connects", () => {
    expect(socketUrl({ host: "100.64.0.1", port: 8747, token: "a b" }, "phone")).toBe("ws://100.64.0.1:8747?token=a+b&client=phone")
  })

  it("can bracket the host when it is IPv6", () => {
    expect(socketUrl({ host: "fd7a::1", port: 8747, token: "t" }, "c")).toBe("ws://[fd7a::1]:8747?token=t&client=c")
  })
})

describe("addressLabel", () => {
  it("can show the host and port", () => {
    expect(addressLabel({ host: "100.64.0.1", port: 8747, token: "t" })).toBe("100.64.0.1:8747")
  })
})

describe("rewriteAttachmentLinks", () => {
  it("can point attachment links at the server when the text has them", () => {
    const text = JSON.stringify({ url: "slagent://attachment/p/c/shot.png" })
    expect(rewriteAttachmentLinks(text, { host: "100.64.0.1", port: 8747, token: "t/1" })).toBe(
      JSON.stringify({ url: "http://100.64.0.1:8747/t%2F1/attachment/p/c/shot.png" }),
    )
  })

  it("can leave the text alone when it has none", () => {
    expect(rewriteAttachmentLinks("{}", { host: "h", port: 1, token: "t" })).toBe("{}")
  })
})
