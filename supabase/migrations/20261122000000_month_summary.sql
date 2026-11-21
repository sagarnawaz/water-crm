-- Monthly summary, calculated in the database (an API request returns at most 1000 rows,
-- and a busy month has more entries than that). Same formulas as src/lib/ledger.ts and
-- docs/BUSINESS_RULES.md#calculations. security invoker: RLS limits it to the caller's business.

create function public.month_summary(p_month date)
returns table (customer_id uuid, opening int, bottles int, empties int, billed int, paid int, closing int)
language sql stable security invoker set search_path = public as $$
  with m as (
    select date_trunc('month', p_month)::date as s,
           (date_trunc('month', p_month) + interval '1 month')::date as e
  )
  select
    c.id,
    (c.opening_balance + coalesce(db.amt, 0) - coalesce(pb.amt, 0))::int,
    coalesce(dm.qty, 0)::int,
    coalesce(dm.empties, 0)::int,
    coalesce(dm.amt, 0)::int,
    coalesce(pm.amt, 0)::int,
    (c.opening_balance + coalesce(db.amt, 0) - coalesce(pb.amt, 0) + coalesce(dm.amt, 0) - coalesce(pm.amt, 0))::int
  from public.customers c
  cross join m
  left join lateral (select sum(d.amount) amt from public.deliveries d
                     where d.customer_id = c.id and d.deleted_at is null and d.date < m.s) db on true
  left join lateral (select sum(p.amount) amt from public.payments p
                     where p.customer_id = c.id and p.deleted_at is null and p.date < m.s) pb on true
  left join lateral (select sum(d.amount) amt, sum(d.qty) qty, sum(d.empties_returned) empties from public.deliveries d
                     where d.customer_id = c.id and d.deleted_at is null and d.date >= m.s and d.date < m.e) dm on true
  left join lateral (select sum(p.amount) amt from public.payments p
                     where p.customer_id = c.id and p.deleted_at is null and p.date >= m.s and p.date < m.e) pm on true
$$;

-- Money received in the month, by payment method.
create function public.month_collections(p_month date)
returns table (method text, amount int)
language sql stable security invoker set search_path = public as $$
  select p.method, sum(p.amount)::int
  from public.payments p
  where p.deleted_at is null
    and p.date >= date_trunc('month', p_month)::date
    and p.date < (date_trunc('month', p_month) + interval '1 month')::date
  group by p.method
$$;

-- First day with any entry or payment, to build the month picker.
create function public.first_activity() returns date
language sql stable security invoker set search_path = public as $$
  select least(
    (select min(date) from public.deliveries where deleted_at is null),
    (select min(date) from public.payments where deleted_at is null)
  )
$$;

revoke execute on function public.month_summary(date), public.month_collections(date), public.first_activity() from public, anon;
grant execute on function public.month_summary(date), public.month_collections(date), public.first_activity() to authenticated, service_role;
