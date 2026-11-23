-- Apply only after private backup and deployment approval.
begin;
create table public.cust_inventory_history (
 user_id uuid not null references auth.users(id) on delete cascade,
 location_id text not null, snapshot_id text not null,
 as_of timestamptz not null, imported_at timestamptz not null,
 stock_cost numeric not null, currency text not null,
 product_count integer not null, negative_quantity_count integer not null,
 valuation_method text,
 primary key(user_id,location_id,snapshot_id)
);
alter table public.cust_inventory_history enable row level security;
revoke all on public.cust_inventory_history from public,anon,authenticated;
grant select on public.cust_inventory_history to authenticated;
grant all on public.cust_inventory_history to service_role;
create policy inventory_history_owner_read on public.cust_inventory_history for select to authenticated using((select auth.uid())=user_id);
create function public.capture_cust_inventory_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.complete and new.snapshot_id is not null and new.stock_cost is not null and
 (new.location_id<>'loc-01' or new.valuation_details->>'method'='reviewed_product_classification_v1') then
 insert into public.cust_inventory_history(user_id,location_id,snapshot_id,as_of,imported_at,stock_cost,currency,product_count,negative_quantity_count,valuation_method)
 values(new.user_id,new.location_id,new.snapshot_id,new.as_of,new.imported_at,new.stock_cost,new.currency,new.product_count,new.negative_quantity_count,new.valuation_details->>'method')
 on conflict(user_id,location_id,snapshot_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.capture_cust_inventory_history() from public,anon,authenticated;
grant execute on function public.capture_cust_inventory_history() to service_role;
create trigger capture_inventory_history after insert or update on public.cust_inventory_snapshots for each row execute function public.capture_cust_inventory_history();
insert into public.cust_inventory_history(user_id,location_id,snapshot_id,as_of,imported_at,stock_cost,currency,product_count,negative_quantity_count,valuation_method)
 select user_id,location_id,snapshot_id,as_of,imported_at,stock_cost,currency,product_count,negative_quantity_count,valuation_details->>'method'
 from public.cust_inventory_snapshots where complete and snapshot_id is not null and stock_cost is not null and (location_id<>'loc-01' or valuation_details->>'method'='reviewed_product_classification_v1');
commit;
