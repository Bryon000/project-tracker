import "server-only";
import { supabaseAdmin } from "./supabase/adminClient";
import { generateLineLinkCode } from "./lineLinkCode";
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

/** 專案列表頁要顯示每個專案的進度/逾期摘要,一次把多個專案的類別+小項目都抓回來,
 * 用 project_id 分組,避免對每個專案各別查一次(N+1)。 */
export async function getCategoriesWithSubtasksForProjects(
  projectIds: string[]
): Promise<Record<string, CategoryWithSubtasks[]>> {
  const grouped: Record<string, CategoryWithSubtasks[]> = {};
  for (const id of projectIds) grouped[id] = [];
  if (projectIds.length === 0) return grouped;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*, subtasks(*)")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true })
    .order("sort_order", { ascending: true, foreignTable: "subtasks" });
  if (error) throw error;

  for (const category of (data ?? []) as CategoryWithSubtasks[]) {
    grouped[category.project_id].push(category);
  }
  return grouped;
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

// ---------- LINE 群組綁定 ----------
//
// 每個專案最多綁一個 LINE 群組,line_group_id 有 DB 層級的 unique 限制,
// 就算程式邏輯有漏洞,也不可能讓兩個專案同時指向同一個群組。
// 綁定/解除綁定都是「條件式 UPDATE」,不是單純的查了再寫,避免競態下互相覆蓋。

const LINE_LINK_CODE_TTL_MS = 15 * 60 * 1000;

/** 產生一組新的連結代碼給這個專案(只有還沒綁定群組時才允許,呼叫端要先檢查)。 */
export async function generateProjectLinkCode(
  projectId: string
): Promise<{ code: string; expiresAt: string }> {
  const code = generateLineLinkCode();
  const expiresAt = new Date(Date.now() + LINE_LINK_CODE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin
    .from("projects")
    .update({ line_link_code: code, line_link_code_expires_at: expiresAt })
    .eq("id", projectId)
    .is("line_group_id", null);
  if (error) throw error;

  return { code, expiresAt };
}

/** 清空這個專案目前的群組綁定(解除綁定)。呼叫端如果要通知舊群組「已被解除」,
 * 要先自己讀一次 project.line_group_id 再呼叫這個函式——更新後這個值就是 null 了。 */
export async function unbindProjectLineGroup(projectId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("projects")
    .update({
      line_group_id: null,
      line_bound_at: null,
      line_link_code: null,
      line_link_code_expires_at: null,
    })
    .eq("id", projectId);
  if (error) throw error;
}

export async function getProjectByGroupId(groupId: string): Promise<Project | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("line_group_id", groupId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * 拿使用者在群組裡貼的代碼,嘗試綁定這個群組。整個「檢查代碼有效 + 檢查專案還沒綁定 +
 * 寫入」都在同一句條件式 UPDATE 裡完成,避免「先查後寫」中間被別的請求(webhook 重複
 * 投遞、或剛好另一個綁定動作)插隊造成的競態。綁定成功回傳更新後的 project,失敗
 * (代碼不對/過期/專案已經被綁走/群組已經被別的專案搶先綁走)回傳 null。
 */
export async function tryBindProjectByLinkCode(
  code: string,
  groupId: string
): Promise<Project | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({
      line_group_id: groupId,
      line_link_code: null,
      line_link_code_expires_at: null,
      line_bound_at: new Date().toISOString(),
    })
    .eq("line_link_code", code)
    .is("line_group_id", null)
    .gt("line_link_code_expires_at", new Date().toISOString())
    .select()
    .maybeSingle();
  if (error) {
    // 23505 = unique_violation:這個 groupId 剛好在這一瞬間被別的專案搶先綁走了。
    if (error.code === "23505") return null;
    throw error;
  }
  return data;
}

/** bot 被踢出/離開一個群組時呼叫:找出綁定這個群組的專案並清空,避免變成殭屍設定
 * (排程每天對一個 bot 已經不在的群組推播、卻永遠沒人知道已經失效)。 */
export async function clearProjectByGroupId(groupId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ line_group_id: null, line_bound_at: null })
    .eq("line_group_id", groupId);
  if (error) throw error;
}

// ---------- Reminders ----------

export interface ProjectWithLineGroup {
  id: string;
  name: string;
  created_by: string;
  line_group_id: string;
}

export async function getProjectsWithLineGroup(): Promise<ProjectWithLineGroup[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, created_by, line_group_id")
    .not("line_group_id", "is", null);
  if (error) throw error;
  return (data ?? []) as ProjectWithLineGroup[];
}

/**
 * 這個專案今天發過提醒了嗎——靠 reminder_sends 的 (project_id, sent_date) unique
 * 限制當鎖,同一天第二次呼叫一定會 insert 失敗(23505),回傳 false 代表還沒發過。
 */
export async function hasReminderBeenSentToday(
  projectId: string,
  sentDate: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("reminder_sends")
    .select("id")
    .eq("project_id", projectId)
    .eq("sent_date", sentDate)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** 只有在真的成功發送之後才呼叫這個 —— 先佔位再發送的話,只要那次發送失敗
 * (不管是暫時性問題還是設定錯誤),當天就再也不會重試,這比重複發送更糟。 */
export async function markReminderSent(projectId: string, sentDate: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("reminder_sends")
    .insert({ project_id: projectId, sent_date: sentDate });
  if (error && error.code !== "23505") throw error;
}
