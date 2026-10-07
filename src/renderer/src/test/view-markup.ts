import { render } from "@testing-library/react"
import type { ReactElement } from "react"

export function viewMarkup(element: ReactElement): string {
  const { container, unmount } = render(element)
  const markup = container.innerHTML
  unmount()
  return markup
}
