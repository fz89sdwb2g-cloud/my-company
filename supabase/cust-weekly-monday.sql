-- Weekly refresh; existing command retains local Kyiv hour=7 guard for DST.
begin;
do $$ declare j record; begin for j in select jobid from cron.job where jobname in ('cust-warehouse-daily-kyiv','cust-sales-daily-kyiv','cust-stores-daily-kyiv','cust-analysis-daily-kyiv') loop perform cron.alter_job(j.jobid,schedule:='0 4,5 * * 1'); end loop; end $$;
update public.cust_inventory_snapshots set sync_interval_minutes=10080 where location_id in ('loc-01','loc-02');
commit;