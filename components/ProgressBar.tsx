export function ProgressBar({
  percent,
  size = "md",
}: {
  percent: number;
  size?: "sm" | "md";
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className={`w-full overflow-hidden rounded-full bg-border/70 ${height}`}>
      <div
        className={`${height} rounded-full bg-accent transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
