"use server";

import { revalidatePath } from "next/cache";
import * as queries from "@/lib/queries";
import { requireUser } from "@/lib/auth";

/** 確認目前登入的人是這個專案的成員,不是就直接擋掉。每個會改資料的 action 開頭都要呼叫。 */
async function requireProjectMember(projectId: string) {
  const user = await requireUser();
  const isMember = await queries.isProjectMember(projectId, user.id);
  if (!isMember) throw new Error("你沒有這個專案的存取權限");
  return user;
}

// ---------- Categories ----------

export async function addCategoryAction(projectId: string, formData: FormData) {
  await requireProjectMember(projectId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await queries.addCategory(projectId, name);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCategoryNameAction(
  projectId: string,
  categoryId: string,
  name: string
) {
  await requireProjectMember(projectId);
  if (!name.trim()) return;
  await queries.updateCategoryName(categoryId, name.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCategoryDriAction(
  projectId: string,
  categoryId: string,
  driName: string,
  driUrl: string
) {
  await requireProjectMember(projectId);
  await queries.updateCategoryDri(categoryId, driName.trim(), driUrl.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleCategoryDoneAction(
  projectId: string,
  categoryId: string,
  done: boolean
) {
  await requireProjectMember(projectId);
  await queries.toggleCategoryDone(categoryId, done);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteCategoryAction(projectId: string, categoryId: string) {
  await requireProjectMember(projectId);
  await queries.deleteCategory(categoryId);
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Subtasks ----------

export async function addSubtaskAction(
  projectId: string,
  categoryId: string,
  formData: FormData
) {
  await requireProjectMember(projectId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await queries.addSubtask(categoryId, name);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSubtaskNameAction(
  projectId: string,
  subtaskId: string,
  name: string
) {
  await requireProjectMember(projectId);
  if (!name.trim()) return;
  await queries.updateSubtaskName(subtaskId, name.trim());
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSubtaskDeadlineAction(
  projectId: string,
  subtaskId: string,
  deadline: string
) {
  await requireProjectMember(projectId);
  await queries.updateSubtaskDeadline(subtaskId, deadline || null);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleSubtaskDoneAction(
  projectId: string,
  subtaskId: string,
  done: boolean
) {
  await requireProjectMember(projectId);
  await queries.toggleSubtaskDone(subtaskId, done);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSubtaskAction(projectId: string, subtaskId: string) {
  await requireProjectMember(projectId);
  await queries.deleteSubtask(subtaskId);
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Todos ----------

export async function addTodoAction(projectId: string, formData: FormData) {
  await requireProjectMember(projectId);
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await queries.addTodo(projectId, text);
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleTodoAction(
  projectId: string,
  todoId: string,
  done: boolean
) {
  await requireProjectMember(projectId);
  await queries.toggleTodo(todoId, done);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTodoAction(projectId: string, todoId: string) {
  await requireProjectMember(projectId);
  await queries.deleteTodo(todoId);
  revalidatePath(`/projects/${projectId}`);
}
