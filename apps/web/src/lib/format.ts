import type { Person } from "../api/types";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateOnlyFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const dateTimeFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" });

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
