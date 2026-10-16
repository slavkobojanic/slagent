# pi-muse-bridge

Pi extension that runs Meta's Muse Code as a model provider, over the official
[`@muse-code/sdk`](https://www.npmjs.com/package/@muse-code/sdk) and the Muse
Session Protocol. The Muse Code subscription pays; no API key is involved.

```
pi install npm:pi-muse-bridge
```

## How it works

- `/model` shows the catalog your own `muse serve` reports (Wonder, Wonder Full,
  Spark, ...), discovered live at startup and on refresh.
- Every request runs one fresh muse turn: pi's transcript is rendered as a
  labelled prompt, Muse runs its own agent loop with its own tools, and the
  answer streams back into pi as text (thinking streams as thinking).
- Muse's tool steps stream through as narration lines (`[using Edit file]`) —
  MSP v1 has no client-declared tools, so pi's tools are not bridged into
  Muse; the turn's work happens with Muse Code's own toolset.
- Usage is reported per completion with a zero cost, since the subscription is
  not billed per token. Muse-side sessions appear in Muse Code's own session
  list.

## Requirements

- The Muse Code CLI, installed with `curl https://dev.meta.ai/install.sh | bash`
  and signed in (`muse` once in a terminal). Without it the provider reads as
  unconfigured.
- No plan mode, rewind, or pi tool bridging: the provider is "Muse as a model".
