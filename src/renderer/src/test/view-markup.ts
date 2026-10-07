import { render } from "@testing-library/react"
import type { ReactElement } from "react"

// Renders a view with the props it is given and returns its HTML. Unmounts before
// returning, so a test compares markup only. The container is removed by setup.ts.
export function viewMarkup(element: ReactElement): string {
  const { container, unmount } = render(element)
  const markup = container.innerHTML
  unmount()
  return markup
}
