import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoriesWithSubtasks,
  getProject,
  getTodos,
  isProjectMember,
} from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { overallProgress } from "@/lib/progress";
import { OverallProgress } from "@/components/OverallProgress";
import { CategoryCard } from "@/components/CategoryCard";
import { AddCategoryForm } from "@/components/AddCategoryForm";
import { TodoList } from "@/components/TodoList";
import { ShareDialog } from "@/components/ShareDialog";

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
  const isMember = await isProjectMember(params.projectId, user.id);
  if (!isMember) notFound();

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
        <ShareDialog />
      </div>

      <OverallProgress percent={progress} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted">事項分類</h2>
        <div className="space-y-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} projectId={project.id} category={category} />
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted">還沒有任何大類別,先新增一個吧。</p>
          )}
        </div>
        <AddCategoryForm projectId={project.id} />
      </section>

      <TodoList projectId={project.id} todos={todos} />
    </main>
  );
}
