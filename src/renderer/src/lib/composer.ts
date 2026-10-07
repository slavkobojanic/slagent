// The prompt input keeps its own state, so programmatic edits go through the
// native setter and an input event to stay in sync with React.
export function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
  if (setter) setter.call(textarea, value)
  else textarea.value = value
  textarea.dispatchEvent(new Event("input", { bubbles: true }))
}

export function composerTextarea(): HTMLTextAreaElement | null {
  return document.querySelector<HTMLTextAreaElement>("main form textarea")
}

export function focusComposer() {
  window.requestAnimationFrame(() => {
    composerTextarea()?.focus()
  })
}

// Replaces the composer text and puts the caret at the end.
export function fillComposer(text: string) {
  window.requestAnimationFrame(() => {
    const textarea = composerTextarea()
    if (!textarea) return
    setTextareaValue(textarea, text)
    textarea.focus()
    textarea.setSelectionRange(text.length, text.length)
  })
}
