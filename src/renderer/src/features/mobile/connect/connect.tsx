import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

export type ConnectProps = {
  text: string
  busy: boolean
  canConnect: boolean
  error: string | null
  onTextChange: (value: string) => void
  onSubmit: () => void
}

export function Connect({ text, busy, canConnect, error, onTextChange, onSubmit }: ConnectProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="server-address" className="text-sm font-medium">
        Server address
      </label>
      <Textarea
        id="server-address"
        value={text}
        rows={3}
        placeholder="ws://100.x.y.z:8747?token=…"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        disabled={busy}
        className="font-mono text-base"
        onChange={(event) => onTextChange(event.target.value)}
      />
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={!canConnect}>
        {busy ? <Spinner className="size-4" /> : null}
        {busy ? "Connecting" : "Connect"}
      </Button>
    </form>
  )
}
