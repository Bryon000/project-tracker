export type MemberRole = "owner" | "editor" | "viewer";

export interface Project {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: MemberRole;
  added_at: string;
}

export interface Subtask {
  id: string;
  category_id: string;
  name: string;
  deadline: string | null;
  done: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  project_id: string;
  name: string;
  dri_name: string | null;
  dri_url: string | null;
  done: boolean;
  sort_order: number;
}

export interface CategoryWithSubtasks extends Category {
  subtasks: Subtask[];
}

export interface Todo {
  id: string;
  project_id: string;
  text: string;
  done: boolean;
  created_at: string;
}

export type DeadlineStatus = "overdue" | "soon" | "ok" | "none";
