import type { Person } from "../api/types";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateOnlyFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const dateTimeFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });

const relativeFormat = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });

/** "3 dakika önce", "dün" … falls back to the date after a week. */
export function formatRelative(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "az önce";
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relativeFormat.format(Math.round(seconds / 86_400), "day");
  return dateFormat.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateFormat.format(new Date(value)) : "—";
}

/** Calendar dates (purchase, warranty) are stored at UTC midnight and must not shift with the time zone. */
export function formatCalendarDate(value: string | null | undefined): string {
  return value ? dateOnlyFormat.format(new Date(value)) : "—";
}

/** ISO timestamp → value for an `<input type="date">`. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export function fullName(person: Person | null | undefined): string {
  return person ? `${person.firstName} ${person.lastName}` : "—";
}
