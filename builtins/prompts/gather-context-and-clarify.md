---
description: Gather context before planning or implementation, then ask the user for the decisions that remain open.
argument-hint: [optional task or goal]
---

Based on our discussion and my intent, gather the facts that we need before planning or implementation.

Inspect the relevant files, existing patterns, constraints, tests, and likely integration points. Use the available read-only tools. Use a configured subagent only when it is available and can gather facts in parallel. Give it a specific research question and ask for concise findings with file paths and the remaining questions that affect implementation. Do not ask the user for facts that the repository or tools can answer.

After the fact-finding, summarize what we know. Use `ask_user` to ask the unresolved decisions that matter for implementation confidence. Ask related questions in one round. Wait for the user's answers, update the context, and only then plan or implement.

$@
