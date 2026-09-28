-- Scheduling is intentionally deferred to
-- 20260928221500_reschedule_custom_domain_reconciler.sql.
-- That migration reads private.runtime_config.edge_functions_base_url
-- and therefore does not hardcode a Staging or Production Supabase URL.
select true as custom_domain_scheduler_deferred;
