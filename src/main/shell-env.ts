import { execFile } from "node:child_process"

// Apps launched from Finder or the Dock don't inherit the variables exported
// in the user's shell profile, so a key set in ~/.zshrc would go unnoticed.
// Ask an interactive login shell for the value and copy it into process.env,
// where Pi looks for provider keys.
export async function importShellEnv(name: string): Promise<void> {
  if (process.env[name]) return
  if (process.platform === "win32") return
  const shell = process.env.SHELL || "/bin/zsh"
  const marker = "__SLAGENT_ENV__"
  const value = await new Promise<string>((resolve) => {
    execFile(
      shell,
      ["-ilc", `printf '${marker}%s${marker}' "$${name}"`],
      { timeout: 5_000, env: process.env },
      (_error, stdout) => {
        const match = String(stdout ?? "").match(new RegExp(`${marker}([\\s\\S]*?)${marker}`))
        resolve(match?.[1]?.trim() ?? "")
      },
    )
  })
  if (value) process.env[name] = value
}
