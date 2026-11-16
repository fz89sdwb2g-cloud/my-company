-- Proposed migration. NOT applied to production.
-- Before applying: export company_data privately and back up schema/policies.
-- Preserve user_id/data/updated_at and all localStorage/cloud payload formats.
begin;
alter table public.company_data enable row level security;
-- Remove prior permissive policies to avoid OR-combination with the new ones.
do $$ declare p record; begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='company_data' loop
  execute format('drop policy %I on public.company_data',p.policyname);
 end loop;
end $$;
revoke all on public.company_data from public, anon, authenticated;
grant select, insert, update, delete on public.company_data to authenticated;
grant all on public.company_data to service_role;
create policy company_owner_select on public.company_data for select to authenticated using ((select auth.uid()) = user_id);
create policy company_owner_insert on public.company_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy company_owner_update on public.company_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy company_owner_delete on public.company_data for delete to authenticated using ((select auth.uid()) = user_id);
commit;
