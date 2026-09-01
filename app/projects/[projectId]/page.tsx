import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoriesWithSubtasks,
  getProject,
  getProjectMemberRole,
  getTodos,
} from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { overallProgress } from "@/lib/progress";
import { OverallProgress } from "@/components/OverallProgress";
import { CategoryList } from "@/components/CategoryList";
import { AddCategoryForm } from "@/components/AddCategoryForm";
import { TodoList } from "@/components/TodoList";
import { ShareDialog } from "@/components/ShareDialog";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await requireUser();
  const project = await getProject(params.projectId);
  if (!project) notFound();

  // 不是這個專案的成員就當作不存在,不能靠猜網址看到別人的專案。
  const role = await getProjectMemberRole(params.projectId, user.id);
  if (!role) notFound();

  const [categories, todos] = await Promise.all([
    getCategoriesWithSubtasks(params.projectId),
    getTodos(params.projectId),
  ]);

  const progress = overallProgress(categories);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className="text-xs text-muted hover:text-accent">
            ← 回到專案列表
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ShareDialog />
          {role === "owner" && (
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          )}
        </div>
      </div>

      <OverallProgress percent={progress} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted">事項分類</h2>
        <CategoryList projectId={project.id} categories={categories} />
        <AddCategoryForm projectId={project.id} />
      </section>

      <TodoList projectId={project.id} todos={todos} />
    </main>
  );
}
