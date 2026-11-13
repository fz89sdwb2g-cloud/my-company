alter table public.cust_inventory_snapshots add column valuation_details jsonb not null default '{}'::jsonb;
create table public.cust_inventory_classification(
 user_id uuid not null references auth.users(id) on delete cascade,
 location_id text not null check(location_id='loc-01'),
 product_id text not null,
 definition_hash text not null check(length(definition_hash)=64),
 item_kind text not null check(item_kind in('stock','palette','delivery','service','unclassified')),
 reviewed_at timestamptz not null default now(),
 primary key(user_id,location_id,product_id)
);
alter table public.cust_inventory_classification enable row level security;
revoke all on public.cust_inventory_classification from public,anon,authenticated;
grant all on public.cust_inventory_classification to service_role;
create or replace function public.save_cust_store_inventory(payload jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer; d jsonb;
begin
 if payload->>'location_id' is distinct from 'loc-01' or payload->>'user_id' is distinct from '5736ec73-12eb-4b2b-83e7-5b0b741e47fa' then raise exception 'Unexpected snapshot scope'; end if;
 d:=payload->'valuation_details';
 if d->>'method' is distinct from 'reviewed_product_classification_v1' then raise exception 'Reviewed classification required'; end if;
 if (payload->>'stock_cost')::numeric+(d->>'excluded_stock_cost')::numeric+(d->>'unclassified_stock_cost')::numeric<>(d->>'catalogue_stock_cost')::numeric
 or (payload->>'product_count')::int+(d->>'excluded_count')::int+(d->>'unclassified_count')::int<>(d->>'catalogue_count')::int
 then raise exception 'Classification reconciliation failed'; end if;
 insert into public.cust_inventory_snapshots(user_id,location_id,location_name,stock_cost,currency,product_count,negative_quantity_count,snapshot_id,as_of,imported_at,complete,last_attempt_at,last_error_code,sync_interval_minutes,valuation_details)
 select x.user_id,x.location_id,x.location_name,x.stock_cost,x.currency,x.product_count,x.negative_quantity_count,x.snapshot_id,x.as_of,x.imported_at,x.complete,x.last_attempt_at,x.last_error_code,x.sync_interval_minutes,x.valuation_details
 from jsonb_populate_record(null::public.cust_inventory_snapshots,payload) x
 on conflict(user_id,location_id) do update set
 location_name=excluded.location_name,stock_cost=excluded.stock_cost,currency=excluded.currency,product_count=excluded.product_count,negative_quantity_count=excluded.negative_quantity_count,snapshot_id=excluded.snapshot_id,as_of=excluded.as_of,imported_at=excluded.imported_at,complete=excluded.complete,last_attempt_at=excluded.last_attempt_at,last_error_code=null,sync_interval_minutes=excluded.sync_interval_minutes,valuation_details=excluded.valuation_details
 where excluded.as_of>=cust_inventory_snapshots.as_of and excluded.last_attempt_at>=cust_inventory_snapshots.last_attempt_at;
 get diagnostics n=row_count;return n=1;
end; $$;
revoke all on function public.save_cust_store_inventory(jsonb) from public,anon,authenticated;
grant execute on function public.save_cust_store_inventory(jsonb) to service_role;