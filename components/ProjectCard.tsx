import Link from "next/link";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent"
    >
      <h3 className="truncate font-semibold">{project.name}</h3>
      <p className="mt-1 text-xs text-muted">
        建立於 {new Date(project.created_at).toLocaleDateString("zh-TW")}
      </p>
    </Link>
  );
}
