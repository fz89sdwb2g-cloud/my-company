create table public.cust_analysis_snapshots(user_id uuid primary key references auth.users(id) on delete cascade,payload jsonb not null,generated_at timestamptz not null,last_attempt_at timestamptz not null,last_error_code text);
alter table public.cust_analysis_snapshots enable row level security;
revoke all on public.cust_analysis_snapshots from public,anon,authenticated;
grant select on public.cust_analysis_snapshots to authenticated;
grant all on public.cust_analysis_snapshots to service_role;
create policy analysis_owner_read on public.cust_analysis_snapshots for select to authenticated using((select auth.uid())=user_id);
create function public.save_cust_analysis(p_payload jsonb,p_attempted timestamptz) returns boolean language plpgsql security invoker set search_path='' as $$
declare n int;begin
insert into public.cust_analysis_snapshots(user_id,payload,generated_at,last_attempt_at,last_error_code) values('5736ec73-12eb-4b2b-83e7-5b0b741e47fa',p_payload,(p_payload->>'generated_at')::timestamptz,p_attempted,null)
on conflict(user_id) do update set payload=excluded.payload,generated_at=excluded.generated_at,last_attempt_at=excluded.last_attempt_at,last_error_code=null where excluded.last_attempt_at>=cust_analysis_snapshots.last_attempt_at;
get diagnostics n=row_count;return n=1;end;$$;
revoke all on function public.save_cust_analysis(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.save_cust_analysis(jsonb,timestamptz) to service_role;