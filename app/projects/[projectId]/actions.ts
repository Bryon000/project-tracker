"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as queries from "@/lib/queries";
import { requireUser } from "@/lib/auth";

// 這幾個 require*Access 都是從資料庫查出「這個 id 實際屬於哪個專案」,
// 再檢查目前使用者是不是那個專案的成員 —— 不能只信任前端傳來的 projectId,
// 不然使用者可以拿自己有權限的 projectId,搭配別人專案裡的 id 來竄改別人的資料。

async function requireProjectAccess(projectId: string) {
  const user = await requireUser();
  const isMember = await queries.isProjectMember(projectId, user.id);
  if (!isMember) throw new Error("你沒有這個專案的存取權限");
  return user;
}

// 刪除整個專案影響範圍最大(連帶砍掉所有類別/小項目/待辦事項),只有 owner 能做,
// 不是任何成員都行 —— 之後共享功能上線,被邀請的 editor/viewer 不該有這個權限。
async function requireProjectOwner(projectId: string) {
  const user = await requireUser();
  const role = await queries.getProjectMemberRole(projectId, user.id);
  if (role !== "owner") throw new Error("只有專案擁有者可以刪除專案");
  return user;
}

async function requireCategoryAccess(categoryId: string) {
  const user = await requireUser();
  const projectId = await queries.getCategoryProjectId(categoryId);
  if (!projectId || !(await queries.isProjectMember(projectId, user.id))) {
    throw new Error("你沒有這個類別的存取權限");
  }
  return projectId;
}

async function requireSubtaskAccess(subtaskId: string) {
  const user = await requireUser();
  const projectId = await queries.getSubtaskProjectId(subtaskId);
  if (!projectId || !(await queries.isProjectMember(projectId, user.id))) {
    throw new Error("你沒有這個小項目的存取權限");
  }
  return projectId;
}

async function requireTodoAccess(todoId: string) {
  const user = await requireUser();
  const projectId = await queries.getTodoProjectId(todoId);
  if (!projectId || !(await queries.isProjectMember(projectId, user.id))) {
    throw new Error("你沒有這個待辦事項的存取權限");
  }
  return projectId;
}

// ---------- Categories ----------

export async function addCategoryAction(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await queries.addCategory(projectId, name);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCategoryNameAction(categoryId: string, name: string) {
  const projectId = await requireCategoryAccess(categoryId);
  if (!name.trim()) return;
  await queries.updateCategoryName(categoryId, name.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCategoryDriAction(
  categoryId: string,
  driName: string,
  driUrl: string
) {
  const projectId = await requireCategoryAccess(categoryId);
  await queries.updateCategoryDri(categoryId, driName.trim(), driUrl.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleCategoryDoneAction(categoryId: string, done: boolean) {
  const projectId = await requireCategoryAccess(categoryId);
  await queries.toggleCategoryDone(categoryId, done);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteCategoryAction(categoryId: string) {
  const projectId = await requireCategoryAccess(categoryId);
  await queries.deleteCategory(categoryId);
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Subtasks ----------

export async function addSubtaskAction(categoryId: string, formData: FormData) {
  const projectId = await requireCategoryAccess(categoryId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await queries.addSubtask(categoryId, name);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSubtaskNameAction(subtaskId: string, name: string) {
  const projectId = await requireSubtaskAccess(subtaskId);
  if (!name.trim()) return;
  await queries.updateSubtaskName(subtaskId, name.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSubtaskDeadlineAction(subtaskId: string, deadline: string) {
  const projectId = await requireSubtaskAccess(subtaskId);
  await queries.updateSubtaskDeadline(subtaskId, deadline || null);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleSubtaskDoneAction(subtaskId: string, done: boolean) {
  const projectId = await requireSubtaskAccess(subtaskId);
  await queries.toggleSubtaskDone(subtaskId, done);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSubtaskNoteAction(subtaskId: string, note: string) {
  const projectId = await requireSubtaskAccess(subtaskId);
  await queries.updateSubtaskNote(subtaskId, note.trim() || null);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSubtaskAction(subtaskId: string) {
  const projectId = await requireSubtaskAccess(subtaskId);
  await queries.deleteSubtask(subtaskId);
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Todos ----------

export async function addTodoAction(projectId: string, formData: FormData) {
  await requireProjectAccess(projectId);
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await queries.addTodo(projectId, text);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleTodoAction(todoId: string, done: boolean) {
  const projectId = await requireTodoAccess(todoId);
  await queries.toggleTodo(todoId, done);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTodoAction(todoId: string) {
  const projectId = await requireTodoAccess(todoId);
  await queries.deleteTodo(todoId);
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Project ----------

export async function deleteProjectAction(projectId: string) {
  await requireProjectOwner(projectId);
  await queries.deleteProject(projectId);
  revalidatePath("/projects");
  redirect("/projects");
}
