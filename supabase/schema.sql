create table public.plantforge_templates (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 400),
  project jsonb not null check (jsonb_typeof(project) = 'object' and project->>'version' = '1'),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.plantforge_templates enable row level security;
revoke all on public.plantforge_templates from anon, authenticated;
grant select on public.plantforge_templates to anon, authenticated;
create policy plantforge_published_templates on public.plantforge_templates
for select to anon, authenticated using (published = true);
