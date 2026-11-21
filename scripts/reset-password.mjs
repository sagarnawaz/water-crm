// Sets a new password for an owner who forgot theirs. Run by us (support).
// Usage: npm run reset-password -- 0300-1234567 "new-strong-password"
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToEmail } from "../src/lib/phone.ts";

// Errors set the exit code and let Node finish on its own; process.exit() with open
// network handles crashes Node on Windows.
async function main() {
  const [rawPhone, password] = process.argv.slice(2);
  if (!rawPhone || !password) return 'Usage: npm run reset-password -- 03xx-xxxxxxx "new-password"';
  const phone = normalizePhone(rawPhone);
  if (!phone) return `"${rawPhone}" is not a Pakistani mobile number.`;
  if (password.length < 8) return "Password must be at least 8 characters.";

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const email = phoneToEmail(phone);
  let user;
  for (let page = 1; !user; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return `Could not look up the login: ${error.message}`;
    user = data.users.find((u) => u.email === email);
    if (data.users.length < 1000) break;
  }
  if (!user) return `No owner login for ${rawPhone}.`;

  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) return `Could not change the password: ${error.message}`;
  console.log(`Password changed for ${rawPhone}. Ask the owner to sign in again.`);
}

const problem = await main();
if (problem) {
  console.error(problem);
  process.exitCode = 1;
}
