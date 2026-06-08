create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  style text not null,
  blg numeric not null,
  srm numeric not null,
  ibu numeric not null,
  abv numeric not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index recipes_user_id_created_at_idx on public.recipes (user_id, created_at desc);

alter table public.recipes enable row level security;

create policy "Users can select own recipes"
  on public.recipes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on public.recipes
  for insert
  to authenticated
  with check (auth.uid() = user_id);
