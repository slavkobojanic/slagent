# Phase 6: Assemble Creates for Stateless Rows

## Pattern

Assemble creates return `ReactElement` (not `ComponentType`). Used for stateless, dumb rows in lists.

```tsx
// message-row/create.tsx - ASSEMBLE
export function createMessageRow({ message }: { message: ChatMessage }) {
  return <MessageRow message={message} />
}

// Used in list owner's observer:
const rows = runStore.messages.map((msg) => createMessageRow({ message: msg }))
return <Transcript rows={rows} />
```

## Rules

- No store, no presenter, no `observer`
- Maps in list owner, not in row
- State lives on list owner's unit, keyed by row id if needed
- Row receives only immutable data props

## Conversion checklist

1. Find stateless row components
2. Remove any row-level store/presenter
3. Move state to list owner's store (keyed by id if row-specific)
4. Change view to accept props
5. Update create to return element
6. Update list owner to map creates

## Candidate rows for conversion

- `message-list/message-row` (currently owning, could be assemble)
- `library/sidebar/chat-row` (currently owning, could be assemble)
- `mobile/chat-list/mobile-chat-row` (currently owning, could be assemble)
- `transcript/question-card/question-options/option-*` (multiple, could be assemble)

## Implementation order

1. Start with `message-row` (highest impact)
2. Then `chat-row`
3. Then mobile rows
4. Then question options

This completes Phase 6 pattern establishment.
