create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  external_shiftway_org_id text unique,
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employees add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.employees add column if not exists external_shiftway_user_id text;

alter table public.checklists add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.daily_sessions add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

insert into public.organizations (name, slug, status)
values ('Cold Stone Checklist', 'cold-stone-checklist', 'active')
on conflict (slug) do nothing;

update public.employees
set organization_id = (select id from public.organizations where slug = 'cold-stone-checklist')
where organization_id is null
  and (
    auth_user_id is not null
    or email is not null
    or name = 'Owner'
  );

update public.checklists
set organization_id = (select id from public.organizations where slug = 'cold-stone-checklist')
where organization_id is null;

update public.daily_sessions ds
set organization_id = coalesce(e.organization_id, c.organization_id, (select id from public.organizations where slug = 'cold-stone-checklist'))
from public.employees e, public.checklists c
where ds.employee_id = e.id
  and ds.checklist_id = c.id
  and ds.organization_id is null;

alter table public.checklists alter column organization_id set not null;
alter table public.daily_sessions alter column organization_id set not null;

alter table public.checklists drop constraint if exists checklists_slug_key;
drop index if exists checklists_slug_key;
create unique index if not exists checklists_organization_slug_key
  on public.checklists (organization_id, slug);

create index if not exists idx_employees_organization on public.employees(organization_id);
create index if not exists idx_checklists_organization on public.checklists(organization_id, sort_order);
create index if not exists idx_daily_sessions_organization_date on public.daily_sessions(organization_id, shift_date);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role text not null check (role in ('manager', 'crew')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by_employee_id uuid references public.employees(id) on delete set null,
  accepted_at timestamptz,
  accepted_by_auth_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_invites_org on public.organization_invites(organization_id, created_at desc);
create index if not exists idx_organization_invites_token on public.organization_invites(token);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

create or replace function public.ensure_default_checklists_for_organization(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.checklists (organization_id, name, slug, description, sort_order)
  values
    (target_org_id, 'Manager Walk', 'manager-walk', 'Daily manager walkthrough and temperature checks', 1),
    (target_org_id, 'Back Room Closer', 'back-room-closer', 'Closing checklist for back room duties', 2),
    (target_org_id, 'Lobby Closer', 'lobby-closer', 'Closing checklist for lobby/front of house', 3),
    (target_org_id, 'Stone Closer', 'stone-closer', 'Closing checklist for cold stone / line area', 4),
    (target_org_id, 'Key Closer', 'key-closer', 'Final lockup and end-of-night checklist', 5)
  on conflict (organization_id, slug) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order;

  with s as (
    select id, slug from public.checklists where organization_id = target_org_id
  )
  insert into public.checklist_sections (checklist_id, name, sort_order)
  select s.id, x.name, x.sort_order
  from s
  join (
    values
      ('manager-walk', 'Temps', 1),
      ('manager-walk', 'Operations', 2),
      ('back-room-closer', 'Back Room', 1),
      ('lobby-closer', 'Lobby', 1),
      ('stone-closer', 'Line / Stone', 1),
      ('key-closer', 'Lockup', 1)
  ) as x(slug, name, sort_order)
    on x.slug = s.slug
  where not exists (
    select 1 from public.checklist_sections cs
    where cs.checklist_id = s.id and cs.name = x.name
  );

  with section_map as (
    select c.slug, cs.id as section_id, cs.name as section_name
    from public.checklist_sections cs
    join public.checklists c on c.id = cs.checklist_id
    where c.organization_id = target_org_id
  )
  insert into public.checklist_items (section_id, label, item_type, temp_min, temp_max, sort_order)
  select sm.section_id, v.label, v.item_type, v.temp_min, v.temp_max, v.sort_order
  from section_map sm
  join (
    values
      ('manager-walk', 'Temps', 'Front dipping cabinet temp', 'temperature', 0::numeric, 10::numeric, 1),
      ('manager-walk', 'Temps', 'Back freezer temp', 'temperature', -20::numeric, 10::numeric, 2),
      ('manager-walk', 'Operations', 'Cash drawers counted', 'checkbox', null::numeric, null::numeric, 1),
      ('manager-walk', 'Operations', 'Store cleaned and stocked', 'checkbox', null::numeric, null::numeric, 2),
      ('back-room-closer', 'Back Room', 'Dishes completed', 'checkbox', null::numeric, null::numeric, 1),
      ('back-room-closer', 'Back Room', 'Sinks sanitized', 'checkbox', null::numeric, null::numeric, 2),
      ('lobby-closer', 'Lobby', 'Tables wiped', 'checkbox', null::numeric, null::numeric, 1),
      ('lobby-closer', 'Lobby', 'Floors mopped', 'checkbox', null::numeric, null::numeric, 2),
      ('stone-closer', 'Line / Stone', 'Stone cleaned', 'checkbox', null::numeric, null::numeric, 1),
      ('stone-closer', 'Line / Stone', 'Toppings stocked', 'checkbox', null::numeric, null::numeric, 2),
      ('key-closer', 'Lockup', 'Doors locked', 'checkbox', null::numeric, null::numeric, 1),
      ('key-closer', 'Lockup', 'Alarm set', 'checkbox', null::numeric, null::numeric, 2)
  ) as v(slug, section_name, label, item_type, temp_min, temp_max, sort_order)
    on v.slug = sm.slug and v.section_name = sm.section_name
  where not exists (
    select 1 from public.checklist_items ci
    where ci.section_id = sm.section_id and ci.label = v.label
  );
end;
$$;

select public.ensure_default_checklists_for_organization(id)
from public.organizations
where slug = 'cold-stone-checklist';

drop function if exists public.get_current_employee();

create or replace function public.get_current_employee()
returns table (
  id uuid,
  auth_user_id uuid,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  external_shiftway_org_id text,
  external_shiftway_user_id text,
  name text,
  email citext,
  role text,
  is_active boolean
)
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
    and e.organization_id is not null
    and e.email = current_email;

  return query
    select
      e.id,
      e.auth_user_id,
      e.organization_id,
      o.name as organization_name,
      o.slug as organization_slug,
      o.external_shiftway_org_id,
      e.external_shiftway_user_id,
      e.name,
      e.email,
      e.role,
      e.is_active
    from public.employees e
    join public.organizations o on o.id = e.organization_id
    where e.auth_user_id = current_auth_id
      and e.is_active = true
      and o.status = 'active'
    limit 1;
end;
$$;

create or replace function public.create_owner_organization(org_name text)
returns table (employee_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_id uuid := auth.uid();
  current_email citext := lower(auth.jwt() ->> 'email')::citext;
  current_name text := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    auth.jwt() ->> 'email'
  );
  cleaned_name text := trim(org_name);
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
  created_org public.organizations;
  existing_employee public.employees;
  owner_employee public.employees;
begin
  if current_auth_id is null then
    raise exception 'You must be signed in to create an organization';
  end if;

  if cleaned_name = '' or length(cleaned_name) < 2 then
    raise exception 'Organization name is required';
  end if;

  select * into existing_employee
  from public.employees e
  where e.auth_user_id = current_auth_id
     or e.email = current_email
  limit 1;

  if existing_employee.id is not null and existing_employee.organization_id is not null then
    raise exception 'This account already belongs to an organization';
  end if;

  base_slug := coalesce(nullif(public.slugify(cleaned_name), ''), 'organization');
  candidate_slug := base_slug;
  while exists (select 1 from public.organizations where slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.organizations (name, slug, created_by_auth_user_id)
  values (cleaned_name, candidate_slug, current_auth_id)
  returning * into created_org;

  perform public.ensure_default_checklists_for_organization(created_org.id);

  if existing_employee.id is not null then
    update public.employees
    set organization_id = created_org.id,
        auth_user_id = current_auth_id,
        email = current_email,
        name = coalesce(nullif(public.employees.name, ''), current_name),
        role = 'owner',
        is_active = true
    where id = existing_employee.id
    returning * into owner_employee;
  else
    insert into public.employees (organization_id, auth_user_id, email, name, role, is_active)
    values (created_org.id, current_auth_id, current_email, current_name, 'owner', true)
    returning * into owner_employee;
  end if;

  return query select owner_employee.id, created_org.id;
end;
$$;

create or replace function public.create_organization_invite(invite_email text, invite_role text)
returns table (
  id uuid,
  email citext,
  role text,
  token text,
  expires_at timestamptz,
  organization_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_id uuid := auth.uid();
  current_employee public.employees;
  created_invite public.organization_invites;
  normalized_email citext := lower(trim(invite_email))::citext;
  org_name text;
begin
  if current_auth_id is null then
    raise exception 'You must be signed in to invite teammates';
  end if;

  select * into current_employee
  from public.employees e
  where e.auth_user_id = current_auth_id
    and e.is_active = true
  limit 1;

  if current_employee.id is null or current_employee.role not in ('owner', 'manager') then
    raise exception 'Only owners and managers can invite teammates';
  end if;

  if invite_role not in ('manager', 'crew') then
    raise exception 'Invite role must be manager or crew';
  end if;

  if current_employee.role = 'manager' and invite_role <> 'crew' then
    raise exception 'Managers can only invite crew members';
  end if;

  if normalized_email is null or normalized_email::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required';
  end if;

  update public.organization_invites oi
  set expires_at = now()
  where oi.organization_id = current_employee.organization_id
    and oi.email = normalized_email
    and oi.accepted_at is null
    and oi.expires_at > now();

  insert into public.organization_invites (organization_id, email, role, invited_by_employee_id)
  values (current_employee.organization_id, normalized_email, invite_role, current_employee.id)
  returning * into created_invite;

  select o.name into org_name
  from public.organizations o
  where o.id = current_employee.organization_id;

  return query
    select created_invite.id, created_invite.email, created_invite.role, created_invite.token, created_invite.expires_at, org_name;
end;
$$;

create or replace function public.get_invite_by_token(invite_token text)
returns table (
  id uuid,
  email citext,
  role text,
  organization_name text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.id, i.email, i.role, o.name as organization_name, i.expires_at
  from public.organization_invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = invite_token
    and i.accepted_at is null
    and i.expires_at > now()
    and o.status = 'active'
  limit 1;
$$;

create or replace function public.accept_organization_invite(invite_token text)
returns table (employee_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_id uuid := auth.uid();
  current_email citext := lower(auth.jwt() ->> 'email')::citext;
  current_name text := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    auth.jwt() ->> 'email'
  );
  invite_row public.organization_invites;
  existing_employee public.employees;
  joined_employee public.employees;
begin
  if current_auth_id is null then
    raise exception 'You must be signed in to accept an invite';
  end if;

  select * into invite_row
  from public.organization_invites i
  where i.token = invite_token
    and i.accepted_at is null
    and i.expires_at > now()
  limit 1
  for update;

  if invite_row.id is null then
    raise exception 'This invite is invalid, expired, or already accepted';
  end if;

  if invite_row.email <> current_email then
    raise exception 'This invite was sent to %, but you are signed in as %', invite_row.email, current_email;
  end if;

  select * into existing_employee
  from public.employees e
  where e.auth_user_id = current_auth_id
     or e.email = current_email
  limit 1;

  if existing_employee.id is not null
    and existing_employee.organization_id is not null
    and existing_employee.organization_id <> invite_row.organization_id then
    raise exception 'This account already belongs to another organization';
  end if;

  if existing_employee.id is not null then
    update public.employees
    set organization_id = invite_row.organization_id,
        auth_user_id = current_auth_id,
        email = current_email,
        name = coalesce(nullif(public.employees.name, ''), current_name),
        role = invite_row.role,
        is_active = true
    where id = existing_employee.id
    returning * into joined_employee;
  else
    insert into public.employees (organization_id, auth_user_id, email, name, role, is_active)
    values (invite_row.organization_id, current_auth_id, current_email, current_name, invite_row.role, true)
    returning * into joined_employee;
  end if;

  update public.organization_invites
  set accepted_at = now(),
      accepted_by_auth_user_id = current_auth_id
  where id = invite_row.id;

  return query select joined_employee.id, invite_row.organization_id;
end;
$$;

create or replace function public.create_employee_profile(emp_name text, emp_email text, emp_role text default 'crew')
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  current_auth_id uuid := auth.uid();
  current_employee public.employees;
  created_row public.employees;
  normalized_email citext := lower(trim(emp_email))::citext;
begin
  if current_auth_id is null then
    raise exception 'You must be signed in to create an employee';
  end if;

  select * into current_employee
  from public.employees e
  where e.auth_user_id = current_auth_id
    and e.is_active = true
  limit 1;

  if current_employee.id is null or current_employee.role not in ('owner', 'manager') then
    raise exception 'Only owners and managers can create employees';
  end if;

  if current_employee.role = 'manager' and emp_role <> 'crew' then
    raise exception 'Managers can only create crew members';
  end if;

  if trim(emp_name) = '' then
    raise exception 'Employee name is required';
  end if;

  if normalized_email is null or normalized_email::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required';
  end if;

  insert into public.employees (organization_id, name, email, role)
  values (current_employee.organization_id, trim(emp_name), normalized_email, emp_role)
  returning * into created_row;

  return created_row;
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

alter table public.organizations enable row level security;
alter table public.organization_invites enable row level security;

drop policy if exists "organizations_all" on public.organizations;
create policy "organizations_all" on public.organizations for all to authenticated using (true) with check (true);

drop policy if exists "organization_invites_all" on public.organization_invites;
create policy "organization_invites_all" on public.organization_invites for all to authenticated using (true) with check (true);

grant execute on function public.ensure_default_checklists_for_organization(uuid) to authenticated;
grant execute on function public.create_owner_organization(text) to authenticated;
grant execute on function public.create_organization_invite(text, text) to authenticated;
grant execute on function public.get_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_organization_invite(text) to authenticated;
grant execute on function public.create_employee_profile(text, text, text) to authenticated;
grant execute on function public.get_current_employee() to authenticated;
