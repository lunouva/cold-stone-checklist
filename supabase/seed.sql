-- Starter organization, checklist, and owner seed data.
-- Run after schema.sql and migrations.

insert into public.organizations (name, slug, status)
values ('Cold Stone Checklist', 'cold-stone-checklist', 'active')
on conflict (slug) do update
set name = excluded.name,
    status = excluded.status;

select public.ensure_default_checklists_for_organization(id)
from public.organizations
where slug = 'cold-stone-checklist';

insert into public.employees (organization_id, name, email, role, is_active)
select id, 'Owner', 'owner@example.com', 'owner', true
from public.organizations
where slug = 'cold-stone-checklist'
on conflict (email) do update
set organization_id = excluded.organization_id,
    role = excluded.role,
    is_active = excluded.is_active;
