# Operations: deploy, onboard, back up, restore

For whoever runs Paani Register: deploying it, adding businesses, and keeping the data safe.

## 1. Production database
Use a **separate Supabase project for production**, not the staging one used for development and tests. The tests create and delete temporary accounts, so they must never run against real customer data.

1. Create a new Supabase project, for example `paani-register-prod`, in the region closest to Pakistan (Singapore or Mumbai).
2. In the **SQL Editor**, run every file in `supabase/migrations/` in filename order.
3. Go to **Authentication → Sign In / Providers**. Turn off **Allow new users to sign up** and keep **Email** enabled.
4. Keep the database password in a password manager. You need it for backups.

## 2. Deploy to Vercel
No domain is needed. Vercel gives a free `https://<name>.vercel.app` address, and you can add a domain later under Project → Settings → Domains.

1. Push the code to GitHub. Vercel deploys the **`main`** branch to production.
2. At [vercel.com](https://vercel.com), choose **Add New → Project**, import `water-crm`, and keep the detected **Next.js** settings.
3. Under **Environment Variables**, add **only these two** (from the production Supabase project → Project Settings → API Keys):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |

   **Never add `SUPABASE_SECRET_KEY` to Vercel.** The app does not need it. It is only for the scripts on your own computer.
4. Click **Deploy**. Every later push to `main` deploys again on its own, and every pull request gets its own preview link.
5. After the first deploy, open the link on a phone:
   - Log in.
   - **Install it:** on Android Chrome, open the ⋮ menu and choose *Add to Home screen* or *Install app*. On an iPhone in Safari, tap Share, then *Add to Home Screen*.
   - Switch on airplane mode. The "No internet" screen should appear.

## 3. Onboard a business
Run these on your computer, with `.env.local` pointing at the **production** project:

```
npm run create-owner -- "Business name" 0300-1234567 "a-strong-password"
```

Then give the owner the link, their phone number and their password, and help them with:
- Settings → set the price per floor.
- Customers → add customers from the paper register, with their old balance and the bottles already at their home.

**Forgot password:** run `npm run reset-password -- 0300-1234567 "new-password"`.

## 4. Backups
There are three layers:
1. **Supabase:** the paid plan takes daily backups with point-in-time restore. The free plan has no backups you can download.
2. **Nightly encrypted dump** (`.github/workflows/backup.yml`). It runs at 02:00 Pakistan time and keeps 30 days. To set it up, open the GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `SUPABASE_DB_URL`: in Supabase, go to **Connect → Session pooler** and copy the URI. Put the database password in place of `[YOUR-PASSWORD]`.
   - `BACKUP_PASSPHRASE`: a long random passphrase. **Save it in a password manager.** Without it, no backup can be opened.

   Then go to **Actions → Nightly database backup → Run workflow** once, and check that it turns green.
3. **Owner's own copy:** Settings → Backup → download the CSV files once a month.

> The repository is **public**, so the backup file is encrypted before it is uploaded. Make the repo private too: Settings → General → Danger Zone → Change visibility.

## 5. Restore a backup
Practise this once before launch, into a spare Supabase project, never into production.

1. Download the artifact: GitHub → Actions → a backup run → **Artifacts**. Unzip it to get `paani-YYYY-MM-DD.sql.gz.gpg`.
2. Decrypt and unpack it (in Git Bash): `gpg -d paani-YYYY-MM-DD.sql.gz.gpg | gunzip > paani.sql`. Enter the `BACKUP_PASSPHRASE` when asked.
3. Create a new, empty Supabase project. Don't run the migrations: the dump already contains the tables, rules and functions.
4. Load the file: `psql "<new project's session pooler URI>" -v ON_ERROR_STOP=1 -f paani.sql`. Postgres 17's `psql` is also in the `postgres:17` Docker image.
5. Turn off sign-ups (section 1, step 3). Then point `.env.local` (and Vercel, if this replaces production) at the new project and log in to check the data.

## 6. Updating the app
1. Run `npm test`, `npm run test:db` (staging) and `npm run test:e2e` (staging).
2. Open a pull request into `main` and check its Vercel preview link.
3. Merge. Vercel deploys it.

A change that adds a migration file must be run in the production SQL Editor **before** merging.
