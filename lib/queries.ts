import "server-only";
import { supabaseAdmin } from "./supabase/adminClient";
import type {
  Category,
  CategoryWithSubtasks,
  Project,
  Staff,
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

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

/** 給員工花名冊授權檢查用:這個專案的花名冊「主人」是誰(= 建立這個專案的人)。 */
export async function getProjectOwnerId(projectId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data?.created_by ?? null;
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

/** 這個使用者在這個專案裡的角色(owner/editor/viewer),不是成員就是 null。刪除專案這類高風險操作只給 owner 用。 */
export async function getProjectMemberRole(
  projectId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

// 這三個是給 Server Action 做授權檢查用:不能只信任前端傳來的 projectId,
// 要從資料庫查出 categoryId/subtaskId/todoId「實際」屬於哪個專案,再檢查權限。
// 不然使用者可以送一個自己有權限的 projectId,搭配別人專案裡的 categoryId 之類的 id 來竄改別人的資料。
export async function getCategoryProjectId(categoryId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("project_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw error;
  return data?.project_id ?? null;
}

export async function getSubtaskProjectId(subtaskId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("subtasks")
    .select("categories(project_id)")
    .eq("id", subtaskId)
    .maybeSingle<{ categories: { project_id: string } | null }>();
  if (error) throw error;
  return data?.categories?.project_id ?? null;
}

export async function getTodoProjectId(todoId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("todos")
    .select("project_id")
    .eq("id", todoId)
    .maybeSingle();
  if (error) throw error;
  return data?.project_id ?? null;
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

/**
 * 拖曳排序後,把整份新順序的 id 清單寫回去(sort_order = 在清單裡的 index)。
 * update 都用 .eq("project_id", projectId) 多鎖一層,就算 orderedIds 裡混進不屬於
 * 這個專案的 id,那筆 update 也只會影響 0 筆,不會真的動到別人專案的資料。
 */
export async function reorderCategories(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin
        .from("categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("project_id", projectId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
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

export async function updateSubtaskNote(
  subtaskId: string,
  note: string | null
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subtasks")
    .update({ note })
    .eq("id", subtaskId);
  if (error) throw error;
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("subtasks").delete().eq("id", subtaskId);
  if (error) throw error;
}

/** 拖曳排序後,把整份新順序的 id 清單寫回去。同樣多鎖 category_id 這一層,防止跨分類竄改。 */
export async function reorderSubtasks(
  categoryId: string,
  orderedIds: string[]
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin
        .from("subtasks")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("category_id", categoryId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
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

// ---------- Staff ----------

/** 屬於這個 owner(專案擁有者)的整份員工花名冊,同一個 owner 名下每個專案都共用這份。 */
export async function getStaffForOwner(ownerId: string): Promise<Staff[]> {
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("*")
    .eq("owner_id", ownerId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addStaff(
  ownerId: string,
  name: string,
  email: string | null
): Promise<Staff> {
  const { data: last } = await supabaseAdmin
    .from("staff")
    .select("sort_order")
    .eq("owner_id", ownerId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = last && last.length > 0 ? last[0].sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .insert({ owner_id: ownerId, name, email, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStaff(staffId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("staff").delete().eq("id", staffId);
  if (error) throw error;
}

/** 給 Server Action 授權檢查用:這個 staffId 實際屬於哪個 owner 的花名冊。 */
export async function getStaffOwnerId(staffId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select("owner_id")
    .eq("id", staffId)
    .maybeSingle();
  if (error) throw error;
  return data?.owner_id ?? null;
}

export async function updateSubtaskAssignee(
  subtaskId: string,
  staffId: string | null
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subtasks")
    .update({ assignee_staff_id: staffId })
    .eq("id", subtaskId);
  if (error) throw error;
}
