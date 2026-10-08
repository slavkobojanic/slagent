import { GitBranchIcon } from "lucide-react";

export type BranchLineProps = {
  label: string;
  aheadBehind: string | null;
};

export function BranchLine({ label, aheadBehind }: BranchLineProps) {
  return (
    <div
      className="flex items-center justify-end mx-auto w-full max-w-3xl gap-1.5 pb-1.5 px-6 text-xs text-foreground/40"
      title="Current branch"
    >
      <GitBranchIcon className="size-3" aria-hidden />
      <span>{label}</span>
      {aheadBehind !== null ? (
        <span className="text-foreground/30">({aheadBehind})</span>
      ) : null}
    </div>
  );
}
