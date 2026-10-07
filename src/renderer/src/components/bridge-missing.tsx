export function BridgeMissing() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-black p-6 text-center text-sm text-white">
      <p>The app bridge did not load.</p>
      <p className="text-white/50">Restart slagent. If this keeps happening, the preload script failed to run.</p>
    </div>
  )
}
