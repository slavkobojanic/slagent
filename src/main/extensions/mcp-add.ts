import type { ExtensionFactory, McpServerConfig } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"

// Lets the model add an MCP server the user asked for, instead of sending them
// to Settings > MCP. The server is saved through slagent's own store, so it
// loads in every later chat, and registered for the running session right away.
export function mcpAddExtension(deps: {
  // Persists the server in slagent's mcp.json; throws with a message for the model.
  addServer: (name: string, config: McpServerConfig) => Promise<void>
}): ExtensionFactory {
  return (pi) => {
    pi.registerTool({
      name: "add_mcp_server",
      label: "Add MCP server",
      description:
        "Add an MCP server to slagent from a streamable HTTP url or a stdio command. The server is saved for every future chat and its tools load into the current session.",
      promptSnippet: "Add an MCP server from a link or command",
      promptGuidelines: [
        "When the user asks to add, set up or wire up an MCP server (a link, a name like Linear, or a command), call add_mcp_server with a short name. Never edit slagent's source or config files for this, and look up the server's url in its docs if you only have a name.",
        "Servers that need OAuth show as needing sign-in in Settings > MCP; tell the user to sign in there.",
      ],
      parameters: Type.Object({
        name: Type.String({ description: "Short server name; letters, digits, _ and -. Tools become mcp__<name>__<tool>." }),
        url: Type.Optional(Type.String({ description: "Streamable HTTP endpoint of a remote server, e.g. https://example.com/mcp." })),
        command: Type.Optional(Type.String({ description: "Executable of a local stdio server, e.g. npx. One executable, not a shell command string." })),
        args: Type.Optional(Type.Array(Type.String(), { description: "Arguments for the stdio command." })),
        description: Type.Optional(Type.String({ description: "What the server offers, in one sentence." })),
        headers: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "HTTP headers for a remote server, e.g. Authorization. Values may use ${ENV_VAR}." })),
        env: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Environment variables for the stdio command. Values may use ${ENV_VAR}." })),
      }),
      async execute(_id, input) {
        const record = (input ?? {}) as {
          name?: unknown
          url?: unknown
          command?: unknown
          args?: unknown
          description?: unknown
          headers?: unknown
          env?: unknown
        }
        const name = typeof record.name === "string" ? record.name.trim() : ""
        if (!name) return fail("Give the server a short name.")
        const hasUrl = typeof record.url === "string" && record.url.trim() !== ""
        const hasCommand = typeof record.command === "string" && record.command.trim() !== ""
        if (hasUrl && hasCommand) return fail("Pass either url or command, not both.")
        if (!hasUrl && !hasCommand) return fail("Pass url for a remote server, or command for a local one.")
        const description = typeof record.description === "string" && record.description.trim() ? record.description.trim() : undefined
        const headers = stringRecord(record.headers)
        const env = stringRecord(record.env)
        let config: McpServerConfig
        if (hasUrl) {
          const url = (record.url as string).trim()
          try {
            const parsed = new URL(url)
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fail("The url must use http or https.")
          } catch {
            return fail(`"${url}" is not a valid URL.`)
          }
          config = { url, headers, description }
        } else {
          config = { command: (record.command as string).trim(), args: stringList(record.args), env, description }
        }
        try {
          await deps.addServer(name, config)
        } catch (error) {
          return fail(error instanceof Error ? error.message : String(error))
        }
        // Connects the server for this session; later chats load it from the saved file.
        try {
          pi.registerMcpServer(name, config)
        } catch (error) {
          return fail(`Saved "${name}", but its tools are not in this chat: ${error instanceof Error ? error.message : String(error)}`)
        }
        return {
          details: { name },
          content: [
            {
              type: "text" as const,
              text: `Added "${name}". Its tools load into this session as they connect (mcp__${name.replace(/-/g, "_")}__<tool>), and it is saved for every future chat. If the server needs OAuth, the user signs in under Settings > MCP.`,
            },
          ],
        }
      },
    })
  }
}

function fail(text: string) {
  return { details: {}, content: [{ type: "text" as const, text }], isError: true }
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.filter((item): item is string => typeof item === "string")
  return items.length > 0 ? items : undefined
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}
