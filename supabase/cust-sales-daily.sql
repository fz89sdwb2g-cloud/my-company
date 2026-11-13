select cron.schedule('cust-sales-daily-kyiv','0 4,5 * * *',$job$
select net.http_post(
 url := 'https://pkdkzkeqzpmglthbilyl.supabase.co/functions/v1/cust-sales-sync',
 headers := jsonb_build_object('Content-Type','application/json','x-cust-sales-key',
 (select decrypted_secret from vault.decrypted_secrets where name='cust_sales_sync_key')),
 body := '{}'::jsonb, timeout_milliseconds := 120000
) where extract(hour from now() at time zone 'Europe/Kyiv')=7;
$job$);
