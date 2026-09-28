create or replace function private.schedule_custom_domain_reconciler()
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_base text;
  v_command text;
  v_job bigint;
begin
  select nullif(value,'') into v_base
  from private.runtime_config
  where key='edge_functions_base_url'
  limit 1;

  if v_base is null then
    raise notice 'custom domain reconciler not scheduled: edge_functions_base_url is not configured';
    return null;
  end if;

  if exists(select 1 from cron.job where jobname='reconcile-business-domains-staging') then
    perform cron.unschedule('reconcile-business-domains-staging');
  end if;
  if exists(select 1 from cron.job where jobname='reconcile-business-domains') then
    perform cron.unschedule('reconcile-business-domains');
  end if;

  v_command:=format(
    $cmd$
      select net.http_post(
        url := %L,
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-cron-secret',(
            select decrypted_secret
            from vault.decrypted_secrets
            where name='custom_domain_reconcile_token'
            order by updated_at desc nulls last,created_at desc
            limit 1
          )
        ),
        timeout_milliseconds := 15000
      );
    $cmd$,
    rtrim(v_base,'/')||'/reconcile-business-domains'
  );

  select cron.schedule('reconcile-business-domains','*/2 * * * *',v_command) into v_job;
  return v_job;
end
$$;

select private.schedule_custom_domain_reconciler();
