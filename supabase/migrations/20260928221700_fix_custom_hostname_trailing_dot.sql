create or replace function private.normalize_custom_hostname(p_hostname text)
returns text
language plpgsql
immutable
set search_path=''
as $$
declare v_host text;
begin
  v_host:=lower(btrim(coalesce(p_hostname,'')));
  v_host:=regexp_replace(v_host,'^https?://','','i');
  v_host:=regexp_replace(v_host,'/.*$','');
  v_host:=regexp_replace(v_host,'\.$','');
  if v_host='' or length(v_host)>253 then raise exception 'Dominio inválido'; end if;
  if v_host !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$' then
    raise exception 'Dominio inválido';
  end if;
  return v_host;
end
$$;
