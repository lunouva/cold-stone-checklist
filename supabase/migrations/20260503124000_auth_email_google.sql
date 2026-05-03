create extension if not exists citext;

alter table public.employees add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.employees add column if not exists email citext;
alter table public.employees alter column pin drop not null;

create unique index if not exists employees_auth_user_id_key
  on public.employees (auth_user_id);

create unique index if not exists employees_email_key
  on public.employees (email);

update public.employees
set email = 'owner@example.com'
where name = 'Owner'
  and email is null;

create or replace function public.create_employee_profile(emp_name text, emp_email text, emp_role text default 'crew')
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  created_row public.employees;
  normalized_email citext := lower(trim(emp_email))::citext;
begin
  if trim(emp_name) = '' then
    raise exception 'Employee name is required';
  end if;

  if normalized_email is null or normalized_email::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required';
  end if;

  insert into public.employees (name, email, role)
  values (trim(emp_name), normalized_email, emp_role)
  returning * into created_row;

  return created_row;
end;
$$;

create or replace function public.get_current_employee()
returns table (id uuid, auth_user_id uuid, name text, email citext, role text, is_active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_id uuid := auth.uid();
  current_email citext := lower(auth.jwt() ->> 'email')::citext;
begin
  if current_auth_id is null then
    return;
  end if;

  update public.employees e
  set auth_user_id = current_auth_id
  where e.auth_user_id is null
    and e.email = current_email;

  return query
    select e.id, e.auth_user_id, e.name, e.email, e.role, e.is_active
    from public.employees e
    where e.auth_user_id = current_auth_id
      and e.is_active = true
    limit 1;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email citext := lower(new.email)::citext;
  user_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );
begin
  insert into public.employees (auth_user_id, email, name, role)
  values (new.id, user_email, user_name, 'crew')
  on conflict (email) do update
  set auth_user_id = coalesce(public.employees.auth_user_id, excluded.auth_user_id),
      name = coalesce(nullif(public.employees.name, ''), excluded.name);

  return new;
end;
$$;

drop trigger if exists trg_auth_users_create_employee on auth.users;
create trigger trg_auth_users_create_employee
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists "employees_select" on public.employees;
create policy "employees_select" on public.employees for select to authenticated using (true);
drop policy if exists "employees_insert" on public.employees;
create policy "employees_insert" on public.employees for insert to authenticated with check (true);
drop policy if exists "employees_update" on public.employees;
create policy "employees_update" on public.employees for update to authenticated using (true);

drop policy if exists "checklists_all" on public.checklists;
create policy "checklists_all" on public.checklists for all to authenticated using (true) with check (true);

drop policy if exists "checklist_sections_all" on public.checklist_sections;
create policy "checklist_sections_all" on public.checklist_sections for all to authenticated using (true) with check (true);

drop policy if exists "checklist_items_all" on public.checklist_items;
create policy "checklist_items_all" on public.checklist_items for all to authenticated using (true) with check (true);

drop policy if exists "daily_sessions_all" on public.daily_sessions;
create policy "daily_sessions_all" on public.daily_sessions for all to authenticated using (true) with check (true);

drop policy if exists "item_completions_all" on public.item_completions;
create policy "item_completions_all" on public.item_completions for all to authenticated using (true) with check (true);

grant execute on function public.create_employee_profile(text, text, text) to authenticated;
grant execute on function public.get_current_employee() to authenticated;
