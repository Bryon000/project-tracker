import { getCategoriesWithSubtasksForProjects, getProjectsForUser } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { getUrgentSubtasks, overallProgress } from "@/lib/progress";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectDialog } from "@/components/NewProjectDialog";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getProjectsForUser(user.id);
  const categoriesByProject = await getCategoriesWithSubtasksForProjects(
    projects.map((p) => p.id)
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">我的專案</h1>
        <NewProjectDialog />
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted">還沒有任何專案,點擊右上角新增一個吧。</p>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const categories = categoriesByProject[project.id] ?? [];
            return (
              <ProjectCard
                key={project.id}
                project={project}
                progress={overallProgress(categories)}
                urgentItems={getUrgentSubtasks(categories)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
