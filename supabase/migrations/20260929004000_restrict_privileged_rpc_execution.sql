-- Revoke unintended anonymous execution from privileged SECURITY DEFINER RPCs.
-- Authenticated operational RPCs remain available to signed-in users.
revoke execute on function public.admin_business_directory_page(integer,integer,text,text,text) from public, anon;
grant execute on function public.admin_business_directory_page(integer,integer,text,text,text) to authenticated, service_role;

revoke execute on function public.admin_dashboard_overview(bigint) from public, anon;
grant execute on function public.admin_dashboard_overview(bigint) to authenticated, service_role;

revoke execute on function public.admin_plan_recommendations_page(integer,integer,integer,text,bigint) from public, anon;
grant execute on function public.admin_plan_recommendations_page(integer,integer,integer,text,bigint) to authenticated, service_role;

revoke execute on function public.admin_set_restaurant_subscription_access(bigint,bigint,jsonb,numeric,timestamptz,text) from public, anon;
grant execute on function public.admin_set_restaurant_subscription_access(bigint,bigint,jsonb,numeric,timestamptz,text) to authenticated, service_role;

revoke execute on function public.complete_table_qr_delivery(bigint) from public, anon;
grant execute on function public.complete_table_qr_delivery(bigint) to authenticated, service_role;

revoke execute on function public.create_cashier_sale(bigint,text,text,text,jsonb) from public, anon;
grant execute on function public.create_cashier_sale(bigint,text,text,text,jsonb) to authenticated, service_role;

revoke execute on function public.get_active_restaurant_tables_for_pos(bigint) from public, anon;
grant execute on function public.get_active_restaurant_tables_for_pos(bigint) to authenticated, service_role;

revoke execute on function public.get_ready_table_qr_orders(bigint) from public, anon;
grant execute on function public.get_ready_table_qr_orders(bigint) to authenticated, service_role;

revoke execute on function public.get_restaurant_staff_directory(bigint) from public, anon;
grant execute on function public.get_restaurant_staff_directory(bigint) to authenticated, service_role;

revoke execute on function public.get_restaurant_subscription_access(bigint) from public, anon;
grant execute on function public.get_restaurant_subscription_access(bigint) to authenticated, service_role;

revoke execute on function public.get_waiter_paid_qr_orders(bigint) from public, anon;
grant execute on function public.get_waiter_paid_qr_orders(bigint) to authenticated, service_role;

revoke execute on function public.restaurant_has_open_cash(bigint) from public, anon;
grant execute on function public.restaurant_has_open_cash(bigint) to authenticated, service_role;

revoke execute on function public.update_waiter_order(bigint,text,text,text,jsonb) from public, anon;
grant execute on function public.update_waiter_order(bigint,text,text,text,jsonb) to authenticated, service_role;

revoke execute on function public.withdraw_table_qr_order(bigint) from public, anon;
grant execute on function public.withdraw_table_qr_order(bigint) to authenticated, service_role;

revoke execute on function public.withdraw_waiter_order(bigint) from public, anon;
grant execute on function public.withdraw_waiter_order(bigint) to authenticated, service_role;

-- Trigger/cron/internal helpers must not be directly callable by clients.
revoke execute on function public.cleanup_expired_table_qr_mp_orders() from public, anon, authenticated;
grant execute on function public.cleanup_expired_table_qr_mp_orders() to service_role;

revoke execute on function public.clear_demo_mp_user_on_inheritance() from public, anon, authenticated;
grant execute on function public.clear_demo_mp_user_on_inheritance() to service_role;

revoke execute on function public.enforce_customer_profile_account_type() from public, anon, authenticated;
grant execute on function public.enforce_customer_profile_account_type() to service_role;

revoke execute on function public.enforce_restaurant_creator_account_type() from public, anon, authenticated;
grant execute on function public.enforce_restaurant_creator_account_type() to service_role;

revoke execute on function public.enforce_restaurant_staff_account_type() from public, anon, authenticated;
grant execute on function public.enforce_restaurant_staff_account_type() to service_role;

revoke execute on function public.mark_mp_credential_source_from_override() from public, anon, authenticated;
grant execute on function public.mark_mp_credential_source_from_override() to service_role;

revoke execute on function public.notify_new_restaurant_by_email() from public, anon, authenticated;
grant execute on function public.notify_new_restaurant_by_email() to service_role;

revoke execute on function public.process_subscription_email_reminders() from public, anon, authenticated;
grant execute on function public.process_subscription_email_reminders() to service_role;

revoke execute on function public.retail_release_expired_online_orders() from public, anon, authenticated;
grant execute on function public.retail_release_expired_online_orders() to service_role;

revoke execute on function public.streaming_sync_order_status() from public, anon, authenticated;
grant execute on function public.streaming_sync_order_status() to service_role;

revoke execute on function public.sync_account_identity() from public, anon, authenticated;
grant execute on function public.sync_account_identity() to service_role;

revoke execute on function public.sync_demo_api_defaults_after_global_change() from public, anon, authenticated;
grant execute on function public.sync_demo_api_defaults_after_global_change() to service_role;
