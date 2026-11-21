/** Pakistani mobile number in any common format → "923XXXXXXXXX", or null if it isn't one. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("03")) d = "92" + d.slice(1);
  else if (d.length === 10 && d.startsWith("3")) d = "92" + d;
  return /^923\d{9}$/.test(d) ? d : null;
}

// ponytail: owners log in with phone + password, stored in Supabase as a synthetic email so no
// SMS provider (and no per-SMS cost) is needed. Switch to Supabase phone auth when OTP reset is wanted.
export const phoneToEmail = (normalized: string) => `${normalized}@phone.paani-register.app`;
