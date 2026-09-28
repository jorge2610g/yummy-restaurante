do $$
begin
  if exists (select 1 from cron.job where jobname='reconcile-business-domains-staging') then
    perform cron.unschedule('reconcile-business-domains-staging');
  end if;
end
$$;

select cron.schedule(
  'reconcile-business-domains-staging',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := 'https://wodqqheeesrelsbacmgx.supabase.co/functions/v1/reconcile-business-domains',
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-cron-secret',(
          select decrypted_secret
          from vault.decrypted_secrets
          where name='custom_domain_reconcile_token'
          order by updated_at desc nulls last, created_at desc
          limit 1
        )
      ),
      timeout_milliseconds := 15000
    );
  $cron$
);
