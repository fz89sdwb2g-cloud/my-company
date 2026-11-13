-- Private CUST aggregates. Readable only by the owner; browser writes are denied.
create table public.cust_inventory_snapshots (
 user_id uuid not null references auth.users(id) on delete cascade,
 location_id text not null, location_name text not null,
 stock_cost numeric(20,2) not null,
 currency text not null check (currency = 'UAH'),
 product_count integer not null check (product_count >= 0),
 negative_quantity_count integer not null default 0,
 snapshot_id text not null, as_of timestamptz not null,
 imported_at timestamptz not null default now(),
 source text not null default 'CUST API /inventory',
 complete boolean not null check (complete),
 primary key (user_id,location_id)
);
alter table public.cust_inventory_snapshots enable row level security;
revoke all on public.cust_inventory_snapshots from anon,authenticated;
grant select on public.cust_inventory_snapshots to authenticated;
grant all on public.cust_inventory_snapshots to service_role;
create policy cust_inventory_owner_read on public.cust_inventory_snapshots
 for select to authenticated using ((select auth.uid()) = user_id);
