// Creates a business and its owner login. Run by us (support), not by customers.
// Usage: npm run create-owner -- "Saaf Paani Supply" 0300-1234567 "a-strong-password"
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToEmail } from "../src/lib/phone.ts";

const [name, rawPhone, password] = process.argv.slice(2);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!name || !rawPhone || !password) fail('Usage: npm run create-owner -- "Business name" 03xx-xxxxxxx "password"');
const phone = normalizePhone(rawPhone);
if (!phone) fail(`"${rawPhone}" is not a Pakistani mobile number.`);
if (password.length < 8) fail("Password must be at least 8 characters.");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: created, error: userErr } = await admin.auth.admin.createUser({
  email: phoneToEmail(phone),
  password,
  email_confirm: true,
  user_metadata: { phone },
});
if (userErr) fail(`Could not create the login: ${userErr.message}`);
const userId = created.user.id;

const { data: business, error: bizErr } = await admin.from("businesses").insert({ name }).select("id").single();
const { error: memErr } = bizErr
  ? { error: bizErr }
  : await admin.from("memberships").insert({ user_id: userId, business_id: business.id });

if (memErr) {
  // Undo so a half-created account can't log in to nothing.
  if (business) await admin.from("businesses").delete().eq("id", business.id);
  await admin.auth.admin.deleteUser(userId);
  fail(`Could not create the business: ${memErr.message}`);
}

console.log(`Created "${name}" (business ${business.id}). Owner logs in with ${rawPhone}.`);
