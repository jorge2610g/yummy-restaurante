-- Pre-production security hardening.
-- Safe changes only: no public behavior should change.

alter function public.normalize_module_array(jsonb)
  set search_path = public, pg_temp;

revoke all privileges on table public.customer_signup_attempts
  from anon, authenticated;
revoke all privileges on table public.restaurant_email_notification_log
  from anon, authenticated;
revoke all privileges on table public.subscription_payment_settings
  from anon, authenticated;
revoke all privileges on table public.table_qr_push_subscriptions
  from anon, authenticated;
revoke all privileges on table public.whatsapp_webhook_diagnostic_log
  from anon, authenticated;
