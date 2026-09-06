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

-- LINE 提醒改成綁在「專案」上(不是綁在使用者帳號上),一個群組同時只能屬於一個專案
-- ——unique 限制是資料庫層級的保護,就算程式邏輯有漏洞,也不可能讓兩個專案同時指向
-- 同一個群組。line_link_code/line_link_code_expires_at 是「連結代碼」機制:代碼有
-- 時效、成功綁定後就清空(等於用過即失效),要換群組必須先把 line_group_id 清空
-- (解除綁定)才能重新綁,不能直接覆蓋。
alter table projects add column line_group_id text unique;
alter table projects add column line_link_code text;
alter table projects add column line_link_code_expires_at timestamptz;
alter table projects add column line_bound_at timestamptz;

-- 這張表原本是「全域一天一次」的防重複發送鎖,現在提醒改成依專案各自發送,
-- 這裡直接重建成依 (project_id, sent_date) 防重複——因為之前只是測試資料,
-- 沒有真的需要保留的紀錄,直接重建比改 schema 更乾淨。
drop table if exists reminder_sends;
create table reminder_sends (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  sent_date date not null,
  created_at timestamptz not null default now(),
  unique (project_id, sent_date)
);

-- Phase 1 先不開 RLS,方便用假使用者測試
-- Phase 2 接上登入後,記得在每張表加上對應的 RLS policy
