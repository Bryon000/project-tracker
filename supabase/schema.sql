create extension if not exists "uuid-ossp";

create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- 專案與使用者的橋樑,Phase 2 共享功能會用到這張表
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','editor','viewer')),
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table categories (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  dri_name text,
  dri_url text,
  done boolean not null default false,
  sort_order int not null default 0
);

create table subtasks (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id) on delete cascade,
  name text not null,
  deadline date,
  done boolean not null default false,
  sort_order int not null default 0,
  note text
);

create table todos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 員工花名冊:屬於「專案擁有者」(owner_id = projects.created_by),不是綁在單一專案,
-- 所以同一個 owner 名下的每個專案都會看到同一份員工列表。email 是給以後 Google 登入
-- 做綁定用的,linked_user_id 綁定前是 null。
create table staff (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null,
  name text not null,
  email text,
  linked_user_id uuid,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table subtasks add column assignee_staff_id uuid references staff(id) on delete set null;

-- Phase 1 先不開 RLS,方便用假使用者測試
-- Phase 2 接上登入後,記得在每張表加上對應的 RLS policy
