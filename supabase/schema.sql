begin;

-- Who may use the Uzidoc site. Everything else in this database belongs to
-- other apps; only accounts listed here can see or change uzidoc_templates.
create table public.uzidoc_owners (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.uzidoc_owners enable row level security;
revoke all on public.uzidoc_owners from anon, authenticated;
grant select on public.uzidoc_owners to authenticated;

create policy "Owners read their own row"
  on public.uzidoc_owners for select to authenticated
  using (user_id = auth.uid());

create or replace function public.uzidoc_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.uzidoc_owners where user_id = auth.uid());
$$;

revoke all on function public.uzidoc_is_owner() from public, anon;
grant execute on function public.uzidoc_is_owner() to authenticated;

-- Template texts, same shape as uzimed's public.system_templates:
--   normal                     one row per organ               parent_key null
--   pathology, parent_key null an organ group (name only)      texts empty
--   pathology, parent_key set  one pathology inside that group
create table public.uzidoc_templates (
  category     text not null check (category in ('normal', 'pathology')),
  key          text not null check (key ~ '^[a-z0-9_]{1,64}$'),
  parent_key   text,
  sort_order   integer not null default 0,
  name_ru      text not null check (btrim(name_ru) <> ''),
  name_uz_latn text not null default '',
  name_uz_cyrl text not null default '',
  text_ru      text not null default '',
  text_uz_latn text not null default '',
  text_uz_cyrl text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (category, key),
  constraint uzidoc_templates_parent_fk foreign key (category, parent_key)
    references public.uzidoc_templates (category, key) on update restrict on delete restrict,
  constraint uzidoc_templates_normal_flat check (category = 'pathology' or parent_key is null),
  constraint uzidoc_templates_not_own_parent check (parent_key is null or parent_key <> key)
);

create index uzidoc_templates_parent_idx on public.uzidoc_templates (category, parent_key);

-- Keys are immutable and the hierarchy is exactly two levels deep.
create or replace function public.uzidoc_templates_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (new.key <> old.key or new.category <> old.category) then
    raise exception 'uzidoc_templates: key and category cannot be changed';
  end if;
  if new.parent_key is not null then
    if exists (select 1 from public.uzidoc_templates p
               where p.category = new.category and p.key = new.parent_key and p.parent_key is not null) then
      raise exception 'uzidoc_templates: parent must be a top-level group';
    end if;
    if exists (select 1 from public.uzidoc_templates c
               where c.category = new.category and c.parent_key = new.key) then
      raise exception 'uzidoc_templates: a group with pathologies cannot be moved under another group';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger tr_uzidoc_templates_guard
  before insert or update on public.uzidoc_templates
  for each row execute function public.uzidoc_templates_guard();

alter table public.uzidoc_templates enable row level security;
revoke all on public.uzidoc_templates from anon, authenticated;
grant select, insert, update, delete on public.uzidoc_templates to authenticated;

create policy "Owners read templates"
  on public.uzidoc_templates for select to authenticated
  using (public.uzidoc_is_owner());

create policy "Owners insert templates"
  on public.uzidoc_templates for insert to authenticated
  with check (public.uzidoc_is_owner());

create policy "Owners update templates"
  on public.uzidoc_templates for update to authenticated
  using (public.uzidoc_is_owner())
  with check (public.uzidoc_is_owner());

create policy "Owners delete templates"
  on public.uzidoc_templates for delete to authenticated
  using (public.uzidoc_is_owner());

-- Grant access to an account (its id from Authentication → Users):
-- insert into public.uzidoc_owners (user_id) values ('<auth user id>');

commit;
