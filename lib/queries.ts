import "server-only";
import { supabaseAdmin } from "./supabase/adminClient";
import type {
  Category,
  CategoryWithSubtasks,
  Project,
  Subtask,
  Todo,
} from "./types";

// ---------- Projects ----------

/** 目前使用者擁有,或被加入 project_members 的所有專案。 */
export async function getProjectsForUser(userId: string): Promise<Project[]> {
  const { data: memberRows, error: memberError } = await supabaseAdmin
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);
  if (memberError) throw memberError;

  const memberProjectIds = (memberRows ?? []).map((row) => row.project_id);

  let query = supabaseAdmin
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  query =
    memberProjectIds.length > 0
      ? query.or(`created_by.eq.${userId},id.in.(${memberProjectIds.join(",")})`)
      : query.eq("created_by", userId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProject(
  name: string,
  userId: string
): Promise<Project> {
  const { data: project, error } = await supabaseAdmin
    .from("projects")
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabaseAdmin
    .from("project_members")
    .insert({ project_id: project.id, user_id: userId, role: "owner" });
  if (memberError) throw memberError;

  return project;
}

/** 這個使用者是不是這個專案的成員(owner/editor/viewer 都算)。給 Server Action 做授權檢查用。 */
export async function isProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// ---------- Categories ----------

export async function getCategoriesWithSubtasks(
  projectId: string
): Promise<CategoryWithSubtasks[]> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*, subtasks(*)")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("sort_order", { ascending: true, foreignTable: "subtasks" });
  if (error) throw error;
  return (data ?? []) as CategoryWithSubtasks[];
}

export async function addCategory(
  projectId: string,
  name: string
): Promise<Category> {
  const { data: last } = await supabaseAdmin
    .from("categories")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = last && last.length > 0 ? last[0].sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({ project_id: projectId, name, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoryName(
  categoryId: string,
  name: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ name })
    .eq("id", categoryId);
  if (error) throw error;
}

export async function updateCategoryDri(
  categoryId: string,
  driName: string,
  driUrl: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ dri_name: driName || null, dri_url: driUrl || null })
    .eq("id", categoryId);
  if (error) throw error;
}

export async function toggleCategoryDone(
  categoryId: string,
  done: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ done })
    .eq("id", categoryId);
  if (error) throw error;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("categories").delete().eq("id", categoryId);
  if (error) throw error;
}

// ---------- Subtasks ----------

export async function addSubtask(
  categoryId: string,
  name: string
): Promise<Subtask> {
  const { data: last } = await supabaseAdmin
    .from("subtasks")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = last && last.length > 0 ? last[0].sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("subtasks")
    .insert({ category_id: categoryId, name, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubtaskName(
  subtaskId: string,
  name: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subtasks")
    .update({ name })
    .eq("id", subtaskId);
  if (error) throw error;
}

export async function updateSubtaskDeadline(
  subtaskId: string,
  deadline: string | null
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subtasks")
    .update({ deadline })
    .eq("id", subtaskId);
  if (error) throw error;
}

export async function toggleSubtaskDone(
  subtaskId: string,
  done: boolean
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subtasks")
    .update({ done })
    .eq("id", subtaskId);
  if (error) throw error;
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("subtasks").delete().eq("id", subtaskId);
  if (error) throw error;
}

// ---------- Todos ----------

export async function getTodos(projectId: string): Promise<Todo[]> {
  const { data, error } = await supabaseAdmin
    .from("todos")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTodo(projectId: string, text: string): Promise<Todo> {
  const { data, error } = await supabaseAdmin
    .from("todos")
    .insert({ project_id: projectId, text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTodo(todoId: string, done: boolean): Promise<void> {
  const { error } = await supabaseAdmin.from("todos").update({ done }).eq("id", todoId);
  if (error) throw error;
}

export async function deleteTodo(todoId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("todos").delete().eq("id", todoId);
  if (error) throw error;
}
