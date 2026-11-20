# Paani Register — Product Requirements (MVP)

## Problem
Small water suppliers in Pakistan keep customers, daily bottle deliveries, payments and dues in paper registers. Registers get lost, totals are added by hand and contain mistakes, and disputes ("I already paid") are hard to settle.

## Product
A mobile-first web app (installable PWA) that replaces the paper register. It is a **digital register**, not a delivery platform.

## User
One **business owner** per business in Phase 1. Not tech-savvy, uses a phone, often while out on deliveries. Riders do not log in.

## Goals
- Enter a whole day's deliveries for about 50 customers in under 2 minutes.
- Find any customer's balance in 2 taps.
- Month-end totals match a hand-checked sample from the paper register.

## In scope (Phase 1)
1. Owner login (phone number + password)
2. Customers: add, edit, deactivate, search by house / floor / area
3. Bottle entries: bottles delivered and empties collected, per customer per day
4. Payments: cash to rider, cash to owner, online to owner; partial and advance payments
5. Automatic balance and bottles-at-home calculation
6. Customer ledger (register view, month by month)
7. Dashboard and monthly summary, CSV export
8. Installable PWA, works at 360px width and on desktop

## Out of scope
Rider accounts, GPS, routes, stock/inventory, payment gateway, customer app, WhatsApp/SMS automation, analytics, stored invoices, bottle deposits (not taken), offline saving, packages or discounts, Urdu UI.

## Screens
The mockup is at https://claude.ai/artifact/YWB7tf3vvb9WEhe3gwmQ9Q. It is private, so ask the owner for access.

Navigation has 4 tabs: **Today · Customers · Summary · Settings**. On desktop (≥1024px) the tabs become a sidebar.

| # | Screen | Purpose |
|---|---|---|
| 1 | Login | Phone number + password. No self sign-up. |
| 2 | Today (home) | The day's totals, search, and a quick-confirm list (− qty + ✓). Usual quantities are shown in grey as suggestions. Customers can be marked "No delivery". A date switcher allows entering past days. |
| 3 | Customers | Search, filters (All / Has dues / Monthly / Daily / Inactive), balance and bottles at home per customer. |
| 4 | Customer ledger | Balance, bottles at home, **Bottles** and **Payment** buttons, month selector, the month's bill status (monthly customers), month totals, register lines with a running balance. Tap a line to correct it. |
| 5 | Add / edit customer | House no, floor and area are required; everything else sits under "More details". |
| 6 | Monthly summary | Business totals, collections by payment method, a per-customer table, CSV export. |
| 7 | Settings | Business name, price per bottle for each floor, backup export, sign out. |

**Add bottles** and **Add payment** open as bottom sheets, not separate screens.

UI rules:
- Touch targets are at least 48px.
- Number fields open the numeric keyboard.
- Due balances show in red and advances in green.
- Amounts use lakh grouping (Rs 1,00,000).

## User flows
1. **Daily entry:**
   1. Open the app on Today.
   2. For each customer, tap ✓, adjust the quantity with − / + and then tap ✓, or tap "No delivery".
   3. The confirmation message offers **Change** (to edit empties) and **Undo**. For daily-paying customers it also offers **Paid Rs X**.
2. **Single entry:**
   1. Search "12-b 2nd" and open the customer's ledger.
   2. Tap **Bottles**.
   3. Set the date, bottles and empties, and say whether they paid now (daily-paying customers only).
   4. Tap Save.
3. **Payment:**
   1. Open the ledger and tap **Payment**.
   2. For monthly customers, choose which month's bill this pays. The oldest unpaid month is pre-selected.
   3. Enter the amount, or use the quick buttons: that month's bill, Full balance.
   4. Choose the method, date and an optional note.
   5. Tap Save.
4. **Second delivery on the same day:** on Today, tap + on a customer who already has an entry. It is saved as a separate entry.
5. **Correction:** in the ledger, tap a line, then edit it or delete it (two taps to confirm). The balance recalculates, and the change is kept in the history.
6. **Month end:**
   1. Open Summary and pick the month.
   2. Read the totals and the per-customer table.
   3. Tap a customer to see their statement.
7. **New customer:**
   1. Go to Customers and tap +.
   2. Enter house no, floor and area. The floor price is shown.
   3. Optionally enter name, phone, payment type, custom price, usual bottles per day, old balance, and bottles already at their home.
   4. If the same customer already exists, saving is blocked and the app offers to open the existing one.

## Acceptance (MVP)
- The owner completes flows 1–4 on a 360px Android phone without being shown how.
- One month is kept in parallel with the paper register, and the totals match.
