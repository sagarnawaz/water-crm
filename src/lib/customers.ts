// Customer rules shared by the form, the server action and tests. See docs/BUSINESS_RULES.md#customers.

export const FLOORS = ["Basement", "Ground", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "Roof"];

export type Customer = {
  id: string;
  house_no: string;
  floor: string;
  area: string;
  name: string | null;
  phone: string | null;
  billing_type: "monthly" | "daily";
  custom_rate: number | null;
  default_qty: number | null;
  opening_balance: number;
  opening_bottles: number;
  active: boolean;
  // from the customer_list view
  rate: number;
  balance: number;
  bottles_at_home: number;
};

export const floorText = (f: string) => (f === "Basement" || f === "Roof" ? f : `${f} floor`);
export const customerLabel = (c: Pick<Customer, "house_no" | "floor">) => `${c.house_no} · ${floorText(c.floor)}`;

/** Rs with Pakistani lakh grouping: 100000 → "Rs 1,00,000". */
export const rs = (n: number) => "Rs " + Math.abs(n).toLocaleString("en-IN");

/** Same normalisation as the database's unique address index. */
export const addressKey = (house: string, floor: string, area: string) =>
  [house, floor, area].map((s) => s.trim().toLowerCase()).join("|");

export type CustomerInput = {
  house_no: string;
  floor: string;
  area: string;
  name: string | null;
  phone: string | null;
  billing_type: "monthly" | "daily";
  custom_rate: number | null;
  default_qty: number | null;
  opening_balance?: number;
  opening_bottles?: number;
  active?: boolean;
};

const MAX = 1_000_000;

/** Reads and checks the customer form. `isNew` allows the opening balance and bottles fields. */
export function parseCustomer(form: FormData, isNew: boolean): { data: CustomerInput } | { error: string } {
  const s = (k: string) => String(form.get(k) ?? "").trim().replace(/\s+/g, " ");
  const floorChoice = s("floor");
  const floor = floorChoice === "__other" ? s("floor_other") : floorChoice;
  const house_no = s("house_no");
  const area = s("area");

  if (!house_no || !floor || !area) return { error: "House no, floor and area are required." };
  if (house_no.length > 40 || floor.length > 30 || area.length > 80) return { error: "House no, floor or area is too long." };

  type Num = { value: number | null; error?: undefined } | { error: string; value?: undefined };
  const whole = (k: string, label: string, min: number, optional = false): Num => {
    const raw = s(k).replace(/,/g, "");
    if (raw === "") return { value: optional ? null : 0 };
    if (!/^-?\d+$/.test(raw)) return { error: `${label} must be a whole number.` };
    const n = Number(raw);
    if (Math.abs(n) > MAX) return { error: `${label} is too large.` };
    if (n < min) return { error: `${label} must be ${min} or more.` };
    return { value: n };
  };

  const rate = whole("custom_rate", "Custom price", 1, true);
  if (rate.error) return { error: rate.error };
  const qty = whole("default_qty", "Usual bottles per day", 1, true);
  if (qty.error) return { error: qty.error };

  const phone = s("phone");
  if (phone && phone.replace(/\D/g, "").length < 10) return { error: "Phone number looks too short." };

  const billing = s("billing_type");
  if (billing !== "monthly" && billing !== "daily") return { error: "Choose how the customer pays." };

  const data: CustomerInput = {
    house_no,
    floor,
    area,
    name: s("name") || null,
    phone: phone || null,
    billing_type: billing,
    custom_rate: rate.value ?? null,
    default_qty: qty.value ?? null,
  };

  if (isNew) {
    const bal = whole("opening_balance", "Old balance", -MAX);
    if (bal.error) return { error: bal.error };
    const btl = whole("opening_bottles", "Bottles at home", 0);
    if (btl.error) return { error: btl.error };
    data.opening_balance = bal.value ?? 0;
    data.opening_bottles = btl.value ?? 0;
  } else {
    data.active = s("active") !== "false";
  }
  return { data };
}

/** Reads the floor price form: every floor and "other floors" must be a whole number above 0. */
export function parseFloorPrices(form: FormData): { prices: Record<string, number>; other: number } | { error: string } {
  const read = (k: string) => String(form.get(k) ?? "").trim().replace(/,/g, "");
  const ok = (v: string) => /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= MAX;
  const prices: Record<string, number> = {};
  for (const f of FLOORS) {
    const v = read(`fp_${f}`);
    if (!ok(v)) return { error: `Price for ${floorText(f)} must be a whole number more than 0.` };
    prices[f] = Number(v);
  }
  const other = read("default_rate");
  if (!ok(other)) return { error: "Price for other floors must be a whole number more than 0." };
  return { prices, other: Number(other) };
}
