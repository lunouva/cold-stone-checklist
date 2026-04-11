-- Cold Stone Checklist app schema
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

-- Launch-safe note:
-- for today we store a 4-digit PIN in a text column used by the app login flow.
-- tighten to hashed/auth-backed credentials after launch.

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  role text not null default 'crew' check (role in ('crew', 'manager', 'owner')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_sections (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.checklist_sections(id) on delete cascade,
  label text not null,
  item_type text not null default 'checkbox' check (item_type in ('checkbox', 'temperature')),
  temp_min numeric,
  temp_max numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_items_temp_range_chk check (
    (item_type = 'temperature' and temp_min is not null and temp_max is not null)
    or
    (item_type = 'checkbox')
  )
);

create table if not exists public.daily_sessions (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  assigned_by uuid references public.employees(id) on delete set null,
  shift_date date not null,
  time_slot text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.daily_sessions(id) on delete cascade,
  item_id uuid not null references public.checklist_items(id) on delete cascade,
  is_checked boolean not null default false,
  value text,
  completed_by uuid references public.employees(id) on delete set null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, item_id)
);

create index if not exists idx_daily_sessions_shift_date on public.daily_sessions(shift_date);
create index if not exists idx_daily_sessions_employee_date on public.daily_sessions(employee_id, shift_date);
create index if not exists idx_daily_sessions_checklist_date on public.daily_sessions(checklist_id, shift_date);
create index if not exists idx_checklist_sections_checklist on public.checklist_sections(checklist_id, sort_order);
create index if not exists idx_checklist_items_section on public.checklist_items(section_id, sort_order);
create index if not exists idx_item_completions_session on public.item_completions(session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_checklists_updated_at on public.checklists;
create trigger trg_checklists_updated_at before update on public.checklists
for each row execute function public.set_updated_at();

drop trigger if exists trg_checklist_sections_updated_at on public.checklist_sections;
create trigger trg_checklist_sections_updated_at before update on public.checklist_sections
for each row execute function public.set_updated_at();

drop trigger if exists trg_checklist_items_updated_at on public.checklist_items;
create trigger trg_checklist_items_updated_at before update on public.checklist_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_sessions_updated_at on public.daily_sessions;
create trigger trg_daily_sessions_updated_at before update on public.daily_sessions
for each row execute function public.set_updated_at();

drop trigger if exists trg_item_completions_updated_at on public.item_completions;
create trigger trg_item_completions_updated_at before update on public.item_completions
for each row execute function public.set_updated_at();

create or replace function public.verify_pin(input_pin text)
returns table (id uuid, name text, role text, is_active boolean)
language sql
security definer
set search_path = public
as $$
  select e.id, e.name, e.role, e.is_active
  from public.employees e
  where e.is_active = true
    and e.pin = input_pin
  limit 1;
$$;

create or replace function public.create_employee(emp_name text, emp_pin text, emp_role text default 'crew')
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  created_row public.employees;
begin
  if emp_pin !~ '^\\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;

  insert into public.employees (name, pin, role)
  values (trim(emp_name), emp_pin, emp_role)
  returning * into created_row;

  return created_row;
end;
$$;

create or replace function public.update_employee_pin(emp_id uuid, new_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_pin !~ '^\\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;

  update public.employees
  set pin = new_pin
  where id = emp_id;
end;
$$;

alter table public.employees enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_sections enable row level security;
alter table public.checklist_items enable row level security;
alter table public.daily_sessions enable row level security;
alter table public.item_completions enable row level security;

-- Launch-day policy: allow app access with anon key + PIN app logic.
-- Tighten this later when proper auth is added.
drop policy if exists "employees_select" on public.employees;
create policy "employees_select" on public.employees for select using (true);
drop policy if exists "employees_insert" on public.employees;
create policy "employees_insert" on public.employees for insert with check (true);
drop policy if exists "employees_update" on public.employees;
create policy "employees_update" on public.employees for update using (true);

drop policy if exists "checklists_all" on public.checklists;
create policy "checklists_all" on public.checklists for all using (true) with check (true);

drop policy if exists "checklist_sections_all" on public.checklist_sections;
create policy "checklist_sections_all" on public.checklist_sections for all using (true) with check (true);

drop policy if exists "checklist_items_all" on public.checklist_items;
create policy "checklist_items_all" on public.checklist_items for all using (true) with check (true);

drop policy if exists "daily_sessions_all" on public.daily_sessions;
create policy "daily_sessions_all" on public.daily_sessions for all using (true) with check (true);

drop policy if exists "item_completions_all" on public.item_completions;
create policy "item_completions_all" on public.item_completions for all using (true) with check (true);

grant execute on function public.verify_pin(text) to anon, authenticated;
grant execute on function public.create_employee(text, text, text) to anon, authenticated;
grant execute on function public.update_employee_pin(uuid, text) to anon, authenticated;
