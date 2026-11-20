// All register dates are calendar dates in Pakistan time, stored as "YYYY-MM-DD".

export const todayPK = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());

export const isISODate = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const addDays = (s: string, n: number) => {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const fmt = (s: string, o: Intl.DateTimeFormatOptions) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });

/** "Fri 20 Nov" */
export const fmtDay = (s: string) => fmt(s, { weekday: "short", day: "numeric", month: "short" });
/** "20 Nov" */
export const fmtDate = (s: string) => fmt(s, { day: "numeric", month: "short" });
/** "November 2026" */
export const fmtMonth = (s: string) => fmt(s.slice(0, 7) + "-01", { month: "long", year: "numeric" });
