-- Newer Supabase projects don't grant table access to the API roles automatically.
-- Grant only what each role needs. RLS (see the init migration) still decides which rows.

grant usage on schema public to authenticated, service_role;

-- service_role: our admin scripts and tests (bypasses RLS; never used in the browser).
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- authenticated: the logged-in owner, through the app.
grant select, update                 on public.businesses   to authenticated;
grant select                         on public.memberships  to authenticated;
grant select, insert, update, delete on public.floor_prices to authenticated;
grant select, insert, update         on public.customers    to authenticated;  -- no delete: deactivate instead
grant select, insert, update         on public.deliveries   to authenticated;  -- no delete: soft delete (deleted_at)
grant select, insert, update         on public.payments     to authenticated;  -- no delete: soft delete (deleted_at)
grant select                         on public.audit_log    to authenticated;  -- written only by the audit trigger

-- Logged-out visitors get nothing (functions are executable by PUBLIC by default).
revoke execute on all functions in schema public from public, anon;
grant execute on function public.my_business_ids()     to authenticated, service_role;
grant execute on function public.current_business_id() to authenticated, service_role;
grant execute on function public.effective_rate(uuid)  to authenticated, service_role;
