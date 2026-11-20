"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, phoneToEmail } from "@/lib/phone";

export type LoginState = { error?: string; phone?: string } | undefined;

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const raw = String(form.get("phone") ?? "");
  const password = String(form.get("password") ?? "");
  const phone = normalizePhone(raw);

  if (!phone) return { error: "Enter your mobile number, like 0300-1234567.", phone: raw };
  if (!password) return { error: "Enter your password.", phone: raw };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
  if (error) return { error: "Phone number or password is wrong.", phone: raw };

  redirect("/");
}
