-- Customers with their current price, balance and bottles at home, always calculated (never stored).
-- Rules: docs/BUSINESS_RULES.md#calculations. security_invoker keeps RLS of the underlying tables.
create view public.customer_list with (security_invoker = true) as
select
  c.*,
  coalesce(c.custom_rate, fp.price, b.default_rate)::int            as rate,
  (c.opening_balance + coalesce(d.billed, 0) - coalesce(p.paid, 0))::int as balance,
  (c.opening_bottles + coalesce(d.qty, 0) - coalesce(d.empties, 0))::int as bottles_at_home
from public.customers c
join public.businesses b on b.id = c.business_id
left join public.floor_prices fp on fp.business_id = c.business_id and fp.floor = c.floor
left join (
  select customer_id, sum(amount) as billed, sum(qty) as qty, sum(empties_returned) as empties
  from public.deliveries where deleted_at is null group by customer_id
) d on d.customer_id = c.id
left join (
  select customer_id, sum(amount) as paid
  from public.payments where deleted_at is null group by customer_id
) p on p.customer_id = c.id;

grant select on public.customer_list to authenticated, service_role;
