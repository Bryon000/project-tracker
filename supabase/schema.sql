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
  sort_order int not null default 0
);

create table todos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Phase 1 先不開 RLS,方便用假使用者測試
-- Phase 2 接上登入後,記得在每張表加上對應的 RLS policy
