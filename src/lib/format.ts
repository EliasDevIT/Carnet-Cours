import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  getISOWeek,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

export const toDate = (value: string | Date) => (typeof value === "string" ? parseISO(value) : value);

export const fmt = (value: string | Date, pattern: string) => format(toDate(value), pattern, { locale: fr });

export const fmtTime = (value: string | Date) => fmt(value, "HH:mm");

export const fmtDay = (value: string | Date) => fmt(value, "EEEE d MMMM");

export const fmtShortDay = (value: string | Date) => fmt(value, "EEE d MMM");

export const weekNumber = (value: Date = new Date()) => getISOWeek(value);

export function relativeDay(value: string | Date) {
  const date = toDate(value);
  if (isToday(date)) return "aujourd'hui";
  if (isTomorrow(date)) return "demain";
  const days = differenceInCalendarDays(date, new Date());
  if (days > 1 && days < 7) return fmt(date, "EEEE");
  return fmt(date, "EEE d MMM");
}

export const daysUntil = (value: string | Date) => differenceInCalendarDays(toDate(value), new Date());

export const ago = (value: string | Date) =>
  formatDistanceToNowStrict(toDate(value), { locale: fr, addSuffix: true });

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export const grade = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "").replace(".", ",");

/** "2026-10-16T08:00" pour un champ datetime-local, en heure locale. */
export const toLocalInput = (value: string | Date) => fmt(value, "yyyy-MM-dd'T'HH:mm");

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Comparaison insensible à la casse et aux accents. */
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
