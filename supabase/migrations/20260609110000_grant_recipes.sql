-- Required for PostgREST API access when the table is created outside supabase db push.
grant select, insert on table public.recipes to anon, authenticated;

-- Refresh PostgREST schema cache so /rest/v1/recipes is available immediately.
notify pgrst, 'reload schema';
