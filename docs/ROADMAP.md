# Roadmap and Testing

## Phases
Each phase ends with a preview deploy and the checks listed for it.

### Phase 0 — Mockup ✅
- **Goal:** check the UX before writing code.
- **Deliverable:** the clickable mockup at https://claude.ai/artifact/YWB7tf3vvb9WEhe3gwmQ9Q.
- **Acceptance:** the owner signs off on the flows. Their decisions are recorded in [DECISIONS.md](DECISIONS.md).

### Phase 1 — Foundation ✅ (Vercel deploy still to do)
- **Goal:** a secure, empty app the owner can log into.
- **Features:**
  - Next.js + TypeScript + Tailwind scaffold.
  - Supabase staging project.
  - Migrations for every table, with RLS and the audit trigger.
  - Phone + password login.
  - App shell with the 4 tabs.
  - A script that creates a business with an owner account.
- **Depends on:** Phase 0.
- **Acceptance:**
  - Login works on a phone.
  - The RLS test passes: user A can't read or write business B.
- **Deliverable:** a deployed shell on Vercel.

### Phase 2 — Customers and floor prices ✅ (built; owner click-through pending)
- **Goal:** the owner can enter their customer list.
- **Features:**
  - Settings floor price list.
  - Customers list with search and filters.
  - Add, edit and deactivate customers.
  - Duplicate check.
  - Opening balance and opening bottles.
- **Depends on:** Phase 1.
- **Acceptance:**
  - Any customer is found in 3 taps or fewer.
  - Duplicates are blocked.
  - The floor price appears in the form.
- **Deliverable:** the Customers and Settings screens.

### Phase 3 — Bottle entries ✅ (browser test passing; "Paid now?" for daily customers moves to Phase 4 with payments)
- **Goal:** daily deliveries are recorded fast and correctly.
- **Features:**
  - Today screen: quick confirm, "No delivery", date switcher.
  - Add bottles sheet with empties.
  - Edit and delete, with the price copied onto each entry.
- **Depends on:** Phase 2.
- **Acceptance:**
  - 50 entries in under 2 minutes.
  - A usual quantity never bills on its own.
  - Same-day adds merge into one entry.
- **Deliverable:** the Today screen.

### Phase 4 — Payments and ledger ✅ (money test and browser test passing)
- **Goal:** every customer has a correct register.
- **Features:**
  - Payment sheet.
  - Ledger view with running balance and month selector.
  - Balance and bottles-at-home views.
  - Audit log visible to us (not in the UI yet).
- **Depends on:** Phase 3.
- **Acceptance:**
  - The **money test passes**.
  - No double-counted payments.
- **Deliverable:** the Customer ledger screen.

### Phase 5 — Summary and export
- **Goal:** month-end in one screen.
- **Features:**
  - Today totals.
  - Monthly summary with collections by method and a per-customer table.
  - Statement view.
  - CSV export.
- **Depends on:** Phase 4.
- **Acceptance:** the month totals match the money test fixture and a hand-checked month.
- **Deliverable:** the Summary screen.

### Phase 6 — PWA and launch
- **Goal:** a production app installed on the owner's phone.
- **Features:**
  - Manifest, icons and service worker.
  - Offline banner.
  - Nightly backup.
  - Production Supabase and domain.
- **Depends on:** Phase 5.
- **Acceptance:**
  - The app installs on Android and iOS.
  - A backup restore is tested once.
  - One week of use alongside the paper register matches it.
- **Deliverable:** the production URL.

## Tests (keep small)
| Test | Covers | Tool |
|---|---|---|
| Money test | The fixture in [BUSINESS_RULES.md](BUSINESS_RULES.md#money-test-fixture-must-pass-before-every-release): balances, statements, price change, empties, soft delete, advance, bill status | `tests/ledger.test.ts` (`npm test`) |
| RLS test | Business A can't select, insert, update or delete rows of business B; balance view | `tests/rls.test.mjs` (`npm run test:db`) |
| Happy path | At 360px: login, prices, customers, Today, edits, payments, daily "Paid" | `tests/e2e/happy-path.spec.ts` (`npm run test:e2e`) |
| UAT | One week with a real supplier alongside their paper register | Manual |

CI runs the money and RLS tests on every PR. Playwright runs before each production deploy. If `npm run dev` is already running, use `E2E_PORT=3000 npm run test:e2e`.
