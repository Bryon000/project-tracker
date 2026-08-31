"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm text-ink">
          發生錯誤:{error.message || "請稍後再試"}
        </p>
        <button
          onClick={reset}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          重試
        </button>
      </div>
    </div>
  );
}
