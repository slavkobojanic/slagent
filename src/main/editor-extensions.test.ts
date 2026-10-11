import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { strToU8, zipSync } from "fflate"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { archiveTarget, ExtensionInstallError, installFromOpenVsx, readInstalled, removeInstalled, searchOpenVsx } from "./editor-extensions"

const API = "https://open-vsx.org/api"

function vsix(entries: Record<string, string>): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  for (const [name, text] of Object.entries(entries)) files[name] = strToU8(text)
  return zipSync(files)
}

const manifest = (overrides: Record<string, unknown> = {}) => JSON.stringify({ name: "vim", publisher: "vscodevim", version: "1.2.3", browser: "./out/web.js", ...overrides })

type Registry = { archive: Uint8Array; sha?: string; version?: string; omitChecksum?: boolean; downloadUrl?: string }

function fakeFetch(registry: Registry) {
  const sha = registry.sha ?? createHash("sha256").update(registry.archive).digest("hex")
  const version = registry.version ?? "1.2.3"
  const files: Record<string, string> = { download: registry.downloadUrl ?? `${API}/vscodevim/vim/${version}/file/vim.vsix` }
  if (!registry.omitChecksum) files.sha256 = `${API}/vscodevim/vim/${version}/file/vim.sha256`
  return async (url: string): Promise<Response> => {
    if (url === `${API}/vscodevim/vim`) return Response.json({ version, files })
    if (url === files.download) return new Response(registry.archive as unknown as ConstructorParameters<typeof Response>[0])
    if (url === files.sha256) return new Response(`${sha}  vim.vsix\n`)
    return new Response("nope", { status: 404 })
  }
}

describe("archiveTarget", () => {
  it("can map a file under extension/ to its relative path", () => {
    expect(archiveTarget("extension/out/web.js")).toBe("out/web.js")
  })

  it("can skip entries outside extension/ and directories", () => {
    expect(archiveTarget("extension.vsixmanifest")).toBeNull()
    expect(archiveTarget("[Content_Types].xml")).toBeNull()
    expect(archiveTarget("extension/out/")).toBeNull()
  })

  it("can flag a path that climbs out", () => {
    expect(archiveTarget("extension/../evil.js")).toBe("unsafe")
    expect(archiveTarget("extension/a/../../evil.js")).toBe("unsafe")
  })

  it("can flag an absolute, backslash or empty segment path", () => {
    expect(archiveTarget("extension//etc/passwd")).toBe("unsafe")
    expect(archiveTarget("extension/a\\b.js")).toBe("unsafe")
  })
})

describe("searchOpenVsx", () => {
  it("can map registry hits to results", async () => {
    const fetchFn = async () =>
      Response.json({
        extensions: [
          { namespace: "vscodevim", name: "vim", version: "1.32.4", displayName: "Vim", description: "Vim emulation", downloadCount: 5, verified: true, files: { icon: `${API}/icon.png` } },
          { namespace: "../x", name: "bad", version: "1.0.0" },
          { namespace: "a", name: "b", version: "../1" },
        ],
      })

    const results = await searchOpenVsx("vim", fetchFn)

    expect(results).toEqual([{ id: "vscodevim.vim", version: "1.32.4", name: "Vim", description: "Vim emulation", downloads: 5, verified: true, iconUrl: `${API}/icon.png` }])
  })

  it("can skip the request for a blank query", async () => {
    let called = false
    const results = await searchOpenVsx("   ", async () => {
      called = true
      return Response.json({})
    })

    expect(results).toEqual([])
    expect(called).toBe(false)
  })

  it("can drop an icon that is not on the registry", async () => {
    const fetchFn = async () => Response.json({ extensions: [{ namespace: "a", name: "b", version: "1.0.0", files: { icon: "https://evil.example/i.png" } }] })

    expect((await searchOpenVsx("x", fetchFn))[0]?.iconUrl).toBeNull()
  })

  it("can fail when the registry errors", async () => {
    await expect(searchOpenVsx("x", async () => new Response("", { status: 500 }))).rejects.toBeInstanceOf(ExtensionInstallError)
  })
})

describe("installFromOpenVsx", () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "slagent-ext-"))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it("can unpack the extension folder under id and version", async () => {
    const archive = vsix({ "extension/package.json": manifest(), "extension/out/web.js": "console.log(1)", "extension.vsixmanifest": "<x/>" })

    const result = await installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive }))

    expect(result).toEqual({ id: "vscodevim.vim", version: "1.2.3" })
    expect(await readFile(join(root, "vscodevim.vim", "1.2.3", "out", "web.js"), "utf8")).toBe("console.log(1)")
    await expect(stat(join(root, "vscodevim.vim", "1.2.3", "extension.vsixmanifest"))).rejects.toThrow()
  })

  it("can replace an older version", async () => {
    await installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive: vsix({ "extension/package.json": manifest({ version: "1.0.0" }) }), version: "1.0.0" }))

    await installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive: vsix({ "extension/package.json": manifest() }) }))

    await expect(stat(join(root, "vscodevim.vim", "1.0.0"))).rejects.toThrow()
    await expect(stat(join(root, "vscodevim.vim", "1.2.3"))).resolves.toBeTruthy()
  })

  it("can refuse a download that does not match its checksum", async () => {
    const archive = vsix({ "extension/package.json": manifest() })

    await expect(installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive, sha: "0".repeat(64) }))).rejects.toThrow("does not match")
  })

  it("can refuse an extension with no published checksum", async () => {
    const archive = vsix({ "extension/package.json": manifest() })

    await expect(installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive, omitChecksum: true }))).rejects.toThrow("no checksum")
  })

  it("can refuse a download address outside the registry", async () => {
    const archive = vsix({ "extension/package.json": manifest() })

    await expect(installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive, downloadUrl: "https://evil.example/x.vsix" }))).rejects.toThrow("unexpected address")
  })

  it("can refuse an archive with a path that climbs out of the folder", async () => {
    const archive = vsix({ "extension/package.json": manifest(), "extension/../../evil.js": "x" })

    await expect(installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive }))).rejects.toThrow("unsafe path")
    await expect(stat(join(root, "..", "evil.js"))).rejects.toThrow()
  })

  it("can refuse an archive whose manifest names another extension", async () => {
    const archive = vsix({ "extension/package.json": manifest({ name: "other" }) })

    await expect(installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive }))).rejects.toThrow("does not match the id")
  })

  it("can refuse an invalid id before any request", async () => {
    await expect(installFromOpenVsx(root, "../evil", async () => new Response("", { status: 500 }))).rejects.toThrow("not a valid extension id")
  })

  it("can leave no staging folder behind after a failure", async () => {
    const archive = vsix({ "extension/package.json": manifest({ name: "other" }) })
    await installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive })).catch(() => undefined)

    const { readdir } = await import("node:fs/promises")
    expect((await readdir(root)).filter((name) => name.startsWith(".staging"))).toEqual([])
  })
})

describe("readInstalled and removeInstalled", () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "slagent-ext-"))
    const archive = vsix({ "extension/package.json": manifest(), "extension/out/web.js": "x", "extension/themes/a.json": "{}" })
    await installFromOpenVsx(root, "vscodevim.vim", fakeFetch({ archive }))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it("can describe an installed extension for the editor", async () => {
    const payload = await readInstalled(root, "vscodevim.vim", "1.2.3", "http://localhost:9")

    expect(payload).toMatchObject({ id: "vscodevim.vim", version: "1.2.3", baseUrl: "http://localhost:9/vscodevim.vim/1.2.3" })
    expect(payload?.files.sort()).toEqual(["out/web.js", "package.json", "themes/a.json"])
    expect(payload?.manifest.browser).toBe("./out/web.js")
  })

  it("can return null for an extension that is not installed", async () => {
    expect(await readInstalled(root, "other.ext", "1.0.0", "http://localhost:9")).toBeNull()
  })

  it("can return null for an id or version that could escape the folder", async () => {
    expect(await readInstalled(root, "../x", "1.0.0", "http://localhost:9")).toBeNull()
    expect(await readInstalled(root, "vscodevim.vim", "../1", "http://localhost:9")).toBeNull()
  })

  it("can remove an installed extension", async () => {
    await removeInstalled(root, "vscodevim.vim")

    expect(await readInstalled(root, "vscodevim.vim", "1.2.3", "http://localhost:9")).toBeNull()
  })

  it("can ignore an invalid id when removing", async () => {
    await expect(removeInstalled(root, "../..")).resolves.toBeUndefined()
  })
})
