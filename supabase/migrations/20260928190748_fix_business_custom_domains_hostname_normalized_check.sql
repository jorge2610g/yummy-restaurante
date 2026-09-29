alter table public.business_custom_domains
  drop constraint if exists business_custom_domains_hostname_normalized;

alter table public.business_custom_domains
  add constraint business_custom_domains_hostname_normalized
  check (
    hostname = lower(hostname)
    and hostname !~ '[[:space:]:/]'
  );
