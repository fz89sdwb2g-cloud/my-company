create table public.cust_sales_snapshots (
 user_id uuid not null references auth.users(id) on delete cascade,
 month date not null check(extract(day from month)=1),
 location_id text not null check(location_id='loc-01'),
 period_from date not null, period_to date not null,
 sales_count integer not null check(sales_count>=0),
 returns_count integer not null check(returns_count>=0),
 gross_sales numeric(20,2) not null check(gross_sales>=0),
 returns_amount numeric(20,2) not null check(returns_amount>=0),
 net_revenue numeric(20,2) not null,
 average_receipt numeric(20,2),
 currency text not null check(currency='UAH'),
 data_as_of timestamptz not null,
 last_business_date date,
 imported_at timestamptz not null,
 last_attempt_at timestamptz not null,
 last_error_code text,
 complete boolean not null check(complete),
 source text not null default 'CUST API /receipts · loc-01 · business_date',
 primary key(user_id,month,location_id),
 check(period_from=month and period_to>=period_from and date_trunc('month',period_to)::date=month),
 check(net_revenue=gross_sales-returns_amount),
 check((sales_count=0 and gross_sales=0 and average_receipt is null) or
 (sales_count>0 and average_receipt=round(gross_sales/sales_count,2)))
);
alter table public.cust_sales_snapshots enable row level security;
revoke all on public.cust_sales_snapshots from anon,authenticated;
grant select on public.cust_sales_snapshots to authenticated;
grant all on public.cust_sales_snapshots to service_role;
create policy sales_owner_read on public.cust_sales_snapshots for select to authenticated using((select auth.uid())=user_id);
create function public.save_cust_sales_snapshot(payload jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.cust_sales_snapshots(user_id,month,location_id,period_from,period_to,sales_count,returns_count,gross_sales,returns_amount,net_revenue,average_receipt,currency,data_as_of,last_business_date,imported_at,last_attempt_at,last_error_code,complete)
 select x.user_id,x.month,x.location_id,x.period_from,x.period_to,x.sales_count,x.returns_count,x.gross_sales,x.returns_amount,x.net_revenue,x.average_receipt,x.currency,x.data_as_of,x.last_business_date,x.imported_at,x.last_attempt_at,x.last_error_code,x.complete
 from jsonb_populate_record(null::public.cust_sales_snapshots,payload) x
 on conflict(user_id,month,location_id) do update set
 period_from=excluded.period_from,period_to=excluded.period_to,sales_count=excluded.sales_count,returns_count=excluded.returns_count,gross_sales=excluded.gross_sales,returns_amount=excluded.returns_amount,net_revenue=excluded.net_revenue,average_receipt=excluded.average_receipt,currency=excluded.currency,data_as_of=excluded.data_as_of,last_business_date=excluded.last_business_date,imported_at=excluded.imported_at,last_attempt_at=excluded.last_attempt_at,last_error_code=null,complete=excluded.complete
 where excluded.data_as_of>=cust_sales_snapshots.data_as_of and excluded.last_attempt_at>=cust_sales_snapshots.last_attempt_at;
 get diagnostics n=row_count; return n=1;
end; $$;
revoke all on function public.save_cust_sales_snapshot(jsonb) from public,anon,authenticated;
grant execute on function public.save_cust_sales_snapshot(jsonb) to service_role;
