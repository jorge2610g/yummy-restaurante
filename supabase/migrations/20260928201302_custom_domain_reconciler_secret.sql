do $$
begin
  if not exists (select 1 from vault.secrets where name='custom_domain_reconcile_token') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
      'custom_domain_reconcile_token',
      'Token interno para reconciliación automática de dominios personalizados'
    );
  end if;
end
$$;
