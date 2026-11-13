-- Daily inventory sync at 07:00 Europe/Kyiv (legacy filename). The dedicated credential stays inside Vault.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
alter table public.cust_inventory_snapshots
 add column if not exists last_attempt_at timestamptz,
 add column if not exists last_error_code text,
 add column if not exists sync_interval_minutes integer check(sync_interval_minutes > 0);
-- Provision a key once; deploy its SHA-256 digest in the sync handler, never its raw value.
do $block$ begin
 if not exists(select 1 from vault.secrets where name='cust_inventory_sync_key') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),
   'cust_inventory_sync_key','Dedicated key for hourly warehouse inventory sync only');
 end if;
end $block$;
-- The scheduler uses UTC. One candidate matches 07:00 Kyiv in each season.
select cron.unschedule(jobid) from cron.job where jobname='cust-warehouse-hourly';
select cron.schedule('cust-warehouse-daily-kyiv','0 4,5 * * *',
$cron$select net.http_post(
 url := 'https://pkdkzkeqzpmglthbilyl.supabase.co/functions/v1/cust-inventory-sync',
 headers := jsonb_build_object('Content-Type','application/json','x-cust-sync-key',
   (select decrypted_secret from vault.decrypted_secrets where name='cust_inventory_sync_key')),
 body := '{}'::jsonb,
 timeout_milliseconds := 120000
)
where extract(hour from now() at time zone 'Europe/Kyiv') = 7;$cron$);
