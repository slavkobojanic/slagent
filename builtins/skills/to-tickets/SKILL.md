---
name: to-tickets
description: Break a plan, spec, or conversation into tracer-bullet tickets with blocking edges, then publish them to the configured tracker.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into **tickets**: tracer-bullet vertical slices. Each ticket declares the tickets that block it.

The issue tracker and triage label vocabulary should have been provided to you. If they were not, use `ask_user` to learn where the tickets should go and which label to apply. Offer local Markdown files under `.scratch/` as the default when the user has no tracker.

## Process

### 1. Gather context

Use the current conversation. If the user gives a reference, such as a spec path, issue number, or URL, read its full body and comments.

### 2. Explore the codebase (optional)

If you have not explored the repository, inspect the current code and tests. Use the project's glossary terms in ticket titles and descriptions. Follow relevant architecture decisions.

Look for safe refactoring that can make the feature easier to implement. Make the change easy, then make the easy change.

### 3. Draft vertical slices

Break the work into **tracer-bullet** tickets.

<vertical-slice-rules>

- Each slice covers a narrow but complete path through the required layers, such as schema, API, UI, and tests. Do not make a horizontal slice of one layer.
- Each slice is demoable or verifiable by itself.
- Each slice fits in one fresh context window.
- Do required prefactoring first.

</vertical-slice-rules>

Give each ticket its **blocking edges**: the tickets that must complete before it can start. A ticket with no blockers can start now.

A wide refactor is an exception to vertical slicing. A wide refactor is one mechanical change whose blast radius spans the codebase. Sequence it as **expand–contract**: add the new form beside the old form, migrate callers in green batches, then remove the old form after all callers migrate. If no migration batch can stay green by itself, keep the sequence and add one final integration-and-verification ticket.

### 4. Review the breakdown with the user

Show a numbered list. For each ticket, show:

- **Title**: short and descriptive.
- **Blocked by**: tickets that must complete first.
- **What it delivers**: end-to-end behavior from the user's point of view.

Use `ask_user` to ask whether the granularity is right, whether the blocking edges are correct, and whether any tickets should be merged or split. Iterate until the user approves the breakdown.

### 5. Publish the tickets

Publish approved tickets in dependency order, blockers first. Do not close or modify a parent issue.

- **Local files**: write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`. Number from `01`. List blocking ticket numbers and titles. Never combine tickets into one file.
- **Issue tracker**: publish one issue per ticket. Use native blocking relationships when available. Otherwise, list blocking issues in the ticket. If the source was an existing issue, make each ticket its sub-issue when the tracker supports it. Apply the configured ready-for-agent triage label unless the user says otherwise.

Work the **frontier**: publish each ticket only after its blockers have identifiers.

<local-ticket-template>

# <NN>: <Ticket title>

**What to build:** The end-to-end behavior this ticket makes work.

**Blocked by:** The numbers and titles of blocking tickets, or “None (can start immediately)”.

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

<issue-template>

## Parent

A reference to the parent issue, if the source was an existing issue.

## What to build

The end-to-end behavior this ticket makes work.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or “None (can start immediately)”. Omit this section when blockers use native relationships.

</issue-template>

Avoid specific file paths or code in tickets because they can become stale. Use an exception only when a prototype produced a decision that prose cannot express as clearly. Include only the decision-rich part of the prototype.
