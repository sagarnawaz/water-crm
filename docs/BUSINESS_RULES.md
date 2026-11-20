# Business Rules, Billing and Ledger

These rules decide money. Any change needs the owner's approval and an update to the money test.

## Customers
- A customer is identified by **house / flat no + floor + area**. Name and phone are optional.
- Every customer also has an internal UUID. Two **active** customers can't share the same house + floor + area; the check ignores case and extra spaces.
- One building can hold many customers on different floors.
- **Payment type** is `monthly` (billed by month) or `daily` (pays per delivery). It changes only how the app prompts for payment, never the maths.
- **Usual bottles per day** (`default_qty`) is optional. Empty means the customer orders on request.
- **Old balance** (`opening_balance`) and **bottles at home** (`opening_bottles`) are copied from the paper register when the customer is created.
- A customer is deactivated, never deleted. An inactive customer can't get new bottle entries.

## Prices
- The price per bottle depends on the **floor**. The owner sets one price per floor in Settings, plus one price for "other" floors.
- A customer may have a **custom price**, which overrides the floor price.
- The effective price is `custom_rate ?? floor_price(floor) ?? business.default_rate`.
- When a bottle entry is saved, the effective price is **copied onto the entry** (`rate`).
- Changing a floor price or a custom price affects **new entries only**. Past entries keep their price.
- A past entry can be re-priced only by editing that entry on purpose.
- There is no separate delivery charge; the floor price covers it.
- There are no packages or discounts.

## Bottle entries
- **A usual quantity is only a suggestion.** Nothing is billed until the owner confirms an entry. The app never creates entries automatically.
- A customer can have **more than one entry on the same day** (for example 2 bottles in the morning and 1 in the evening). Each delivery is saved as its own entry. The app shows a note when the date already has an entry, but does not block it.
- An entry records `qty` (full bottles delivered) and `empties_returned`.
- `qty >= 0`, `empties_returned >= 0`, and `qty + empties_returned > 0`. An entry with `qty = 0` is an "empties pickup" and costs nothing.
- Empties default to `qty` (the usual swap) and can be edited.
- Entry amount = `qty × rate`.
- Dates are calendar dates in **Asia/Karachi**. Future dates are blocked. Dates more than 60 days back show a warning.

## Payments
- A payment has a date, an amount (whole rupees, > 0), a method, and an optional note.
- The methods are `cash_rider`, `cash_owner` and `online`. The method also tells you who received the money.
- **Monthly customers:** every payment is marked **for a month** (`for_month`). The payment form suggests the oldest month that still has an amount left, and the owner can change it. Each month then shows its bill status: bill amount, paid for that month, and amount left (or "Paid ✓").
- **Daily customers:** payments have no month (`for_month` is empty).
- Either way, every payment also reduces the customer's overall running balance. The month tag only says which bill it pays; it does not change the total.
- Paying more than is owed creates an **advance**, which is a negative balance.
- Payments over Rs 50,000 need a second tap to confirm. Payments over Rs 10,00,000 are rejected.
- Double saves are prevented by a client-generated UUID primary key, so a repeated insert does nothing.
- The app never creates payments automatically. The "Paid Rs X" shortcut is an explicit owner action.

## Calculations
All amounts are integer rupees. Deleted rows (`deleted_at` set) are always excluded.

```
balance(c, as_of)  = c.opening_balance
                   + Σ entry.qty × entry.rate      (entry.date ≤ as_of)
                   − Σ payment.amount              (payment.date ≤ as_of)

bottles_at_home(c) = c.opening_bottles + Σ entry.qty − Σ entry.empties_returned

month M statement:
  opening  = balance(c, last day of M−1)
  bottles  = Σ qty in M,   empties = Σ empties_returned in M
  billed   = Σ qty × rate in M
  paid     = Σ payment.amount in M
  closing  = opening + billed − paid

month M bill (monthly customers):
  bill      = Σ qty × rate of entries dated in M
  paid_for  = Σ payment.amount where for_month = M
  left      = bill − paid_for        (> 0 unpaid, 0 paid, < 0 extra/advance)
```
- `paid` (money received during M) and `paid_for` (money marked for M's bill) can differ. For example, October's bill is often paid in early November.
- The old balance from the paper register is not part of any month's bill. It appears only in the overall balance.

- A positive balance means the customer owes money. A negative balance is an advance.
- Ledger order: by date, then bottle entries before payments, then `created_at`. Several entries on one day appear as separate lines.
- The running balance starts from the month's opening balance.
- Totals are **always calculated, never stored**, so they can't drift out of sync.

## Corrections and history
- Edits and deletes are allowed on any past entry or payment.
- Deletes are soft deletes (`deleted_at`).
- Every insert, update and delete is written to `audit_log`, with the old row, the new row, the user and the time.
- Editing an old entry changes every later month. Statements are recalculated, never stored.

## Edge cases
| Case | Rule |
|---|---|
| Same house + floor + area as an existing customer | Blocked; the app offers "Open existing" |
| Double tap on Save | The same UUID means the second insert does nothing |
| Bottles for an inactive customer | Blocked until the customer is reactivated |
| Payment with no delivery | Allowed (advance) |
| Price changed in the middle of the month | Lines show their own price; totals add each line up |
| More empties returned than bottles at home | Warning, not blocked (the paper count may be wrong) |
| Floor not in the list | "Other" with free text; uses the "other floors" price or a custom price |
| Daily customer pays only part | Payment row for the paid amount; the rest stays in the balance |
| Partial amount equal to or above the total | Rejected; the owner should choose "Paid full" |

## Money test fixture (must pass before every release)
- One customer with an opening balance of Rs 600 and 2 opening bottles.
- Entries in October at Rs 110. The price changes to Rs 120 on 11 Nov, and November entries use the new price.
- One empties-only pickup.
- One deleted entry, which must not count.
- Two entries on the same day, which must both count.
- One partial payment for October paid in November, then one overpayment for November that leaves an advance.
- The check also asserts the October and November bill status (`left`).
- The check asserts the October and November statements, the final balance, and the bottles at home.
