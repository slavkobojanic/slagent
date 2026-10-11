// One visible line of the file tree, already flattened with its depth.
export type TreeRow = {
  path: string
  name: string
  depth: number
  dir: boolean
  expanded: boolean
  loading: boolean
}
