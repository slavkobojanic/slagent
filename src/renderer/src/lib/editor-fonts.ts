import interUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url"
import geistUrl from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"
import monaspaceUrl from "@/assets/fonts/MonaspaceNeonVar.woff2?url"

export type EditorFont = {
  family: string
  weight: string
  data: ArrayBuffer
}

const FONTS = [
  { family: "Geist Variable", weight: "100 900", url: geistUrl },
  { family: "Inter Variable", weight: "100 900", url: interUrl },
  { family: "Monaspace Neon Var", weight: "100 800", url: monaspaceUrl },
]

// The app's own fonts as bytes, for the editor frame, which cannot load them from the app's origin.
export async function loadEditorFonts(): Promise<EditorFont[]> {
  return Promise.all(
    FONTS.map(async ({ family, weight, url }) => {
      const response = await fetch(url)
      return { family, weight, data: await response.arrayBuffer() }
    }),
  )
}
