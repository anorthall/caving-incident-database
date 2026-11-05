import type { ImpreciseDate } from "@/lib/api";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatShortDate(date: ImpreciseDate): string {
  if (date.precision === "year") return String(date.year);
  if (date.precision === "month" && date.month) {
    return `${SHORT_MONTHS[date.month - 1]} ${date.year}`;
  }
  if (date.precision === "day" && date.month && date.day) {
    return `${SHORT_MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
  }
  return date.display;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
