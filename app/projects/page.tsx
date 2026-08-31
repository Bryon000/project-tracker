import { getProjectsForUser } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectDialog } from "@/components/NewProjectDialog";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getProjectsForUser(user.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">我的專案</h1>
        <NewProjectDialog />
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted">還沒有任何專案,點擊右上角新增一個吧。</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </main>
  );
}
