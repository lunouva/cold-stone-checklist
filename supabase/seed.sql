-- Starter checklist seed data

insert into public.checklists (name, slug, description, sort_order)
values
  ('Manager Walk', 'manager-walk', 'Daily manager walkthrough and temperature checks', 1),
  ('Back Room Closer', 'back-room-closer', 'Closing checklist for back room duties', 2),
  ('Lobby Closer', 'lobby-closer', 'Closing checklist for lobby/front of house', 3),
  ('Stone Closer', 'stone-closer', 'Closing checklist for cold stone / line area', 4),
  ('Key Closer', 'key-closer', 'Final lockup and end-of-night checklist', 5)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

with s as (
  select id, slug from public.checklists
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

select public.create_employee('Owner', '1234', 'owner')
where not exists (
  select 1 from public.employees where name = 'Owner'
);
