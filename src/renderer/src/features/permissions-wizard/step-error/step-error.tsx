export function StepError({ error }: { error: string | null }) {
  if (error === null) {
    return null
  }
  return (
    <p role="alert" className="mt-3 text-sm text-destructive">
      {error}
    </p>
  )
}
