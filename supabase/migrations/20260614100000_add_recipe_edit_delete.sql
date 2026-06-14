-- Add updated_at column and backfill from created_at.
alter table public.recipes add column updated_at timestamptz;
update public.recipes set updated_at = created_at;
alter table public.recipes alter column updated_at set not null;
alter table public.recipes alter column updated_at set default now();

-- Allow authenticated users to update their own recipes.
create policy "Users can update own recipes"
  on public.recipes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to delete their own recipes.
create policy "Users can delete own recipes"
  on public.recipes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Grant update/delete to authenticated only (not anon).
grant update, delete on table public.recipes to authenticated;

notify pgrst, 'reload schema';
