# Paani Register (water-crm)

A mobile-first web app that replaces the paper register for small water supply businesses in Pakistan. It records bottles delivered, empties collected and payments received, and works out each customer's balance.

**Status:** Phase 1 (foundation) is built: login, database with tenant isolation, and the app shell. Phase 2 (customers and floor prices) is next.

## Docs
| Doc | What it covers |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Problem, scope, screens, user flows |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | Pricing, entries, payments, balance maths, edge cases |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, database schema, tenancy, auth, backup, deploy |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Build phases, acceptance criteria, tests |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What the owner confirmed and what is still open |

The clickable mockup is at https://claude.ai/artifact/YWB7tf3vvb9WEhe3gwmQ9Q. It is private, so ask the owner for access.

## Local startup
Needs Node 24+ and a free [Supabase](https://supabase.com) project. Use a separate **staging** project for development and tests, never production.

1. **Install:** `npm install`
2. **Create the database:** in the Supabase dashboard, open **SQL Editor**, paste the contents of [supabase/migrations/20261120000000_init.sql](supabase/migrations/20261120000000_init.sql), and click Run.
3. **Lock down sign-ups:** go to **Authentication → Sign In / Providers**. Turn off "Allow new users to sign up" and keep Email enabled. Accounts are created only by us.
4. **Add keys:** copy `.env.example` to `.env.local` and fill in the 3 values from **Project Settings → API Keys**.
5. **Create an owner:** `npm run create-owner -- "Saaf Paani Supply" 0300-1234567 "a-strong-password"`
6. **Run:** `npm run dev`, open http://localhost:3000, and sign in with that phone number and password.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally |
| `npm test` | Fast tests with no database (phone number parsing) |
| `npm run test:db` | Checks against your staging Supabase that one business can't see or change another's data, plus the database rules |
| `npm run build` | Production build |
| `npm run create-owner -- "Name" 03xx-xxxxxxx "password"` | Create a business and its owner login |

How login works: owners sign in with phone number + password. Supabase stores this as an email-style login (`923001234567@phone.paani-register.app`), so no SMS provider is needed and nothing is paid per login. No email is ever sent to that address.
