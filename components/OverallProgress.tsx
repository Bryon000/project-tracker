import { ProgressBar } from "./ProgressBar";

export function OverallProgress({ percent }: { percent: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted">總進度</span>
        <span className="text-lg font-semibold tabular-nums">{percent}%</span>
      </div>
      <ProgressBar percent={percent} />
    </div>
  );
}
