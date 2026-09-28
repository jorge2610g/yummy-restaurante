create or replace function public.service_get_runtime_config(p_key text)
returns text
language sql
security definer
set search_path=''
as $$
  select rc.value
  from private.runtime_config rc
  where rc.key=p_key
  limit 1
$$;

revoke all on function public.service_get_runtime_config(text) from public,anon,authenticated;
grant execute on function public.service_get_runtime_config(text) to service_role;
