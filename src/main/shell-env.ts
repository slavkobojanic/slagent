import { execFile } from "node:child_process"

// Apps launched from Finder or the Dock don't inherit the variables exported
// in the user's shell profile, so a key set in ~/.zshrc would go unnoticed.
// Ask an interactive login shell for the value and copy it into process.env,
// where Pi looks for provider keys.
export async function importShellEnv(name: string): Promise<void> {
  if (process.env[name]) return
  if (process.platform === "win32") return
  const value = await runLoginShell(`"$${name}"`)
  if (value) process.env[name] = value
}

// The same bare environment leaves a shell in the built-in terminal without
// brew, node or pnpm on PATH. Resolved once, on the first terminal.
let loginPath: string | null = null

export async function importShellPath(): Promise<string | null> {
  if (process.platform === "win32") return null
  if (loginPath !== null) return loginPath
  const value = await runLoginShell('"$PATH"')
  loginPath = value || null
  return loginPath
}

// The value travels between markers so profile banners and prompt output around
// it are ignored.
function runLoginShell(expression: string): Promise<string> {
  const shell = process.env.SHELL || "/bin/zsh"
  const marker = "__SLAGENT_ENV__"
  return new Promise((resolve) => {
    execFile(
      shell,
      ["-ilc", `printf '${marker}%s${marker}' ${expression}`],
      { timeout: 5_000, env: process.env },
      (_error, stdout) => {
        const match = String(stdout ?? "").match(new RegExp(`${marker}([\\s\\S]*?)${marker}`))
        resolve(match?.[1]?.trim() ?? "")
      },
    )
  })
}
