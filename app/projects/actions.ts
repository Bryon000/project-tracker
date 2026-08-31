"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createProject } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/serverClient";

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const project = await createProject(name, user.id);
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
