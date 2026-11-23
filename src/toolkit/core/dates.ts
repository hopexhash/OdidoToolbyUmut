export type DateFormat = 'dd-MM-yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy';

const pad = (n: number) => (n < 10 ? '0' + n : String(n));

/** ISO yyyy-MM-dd in local time (value format for <input type=date>). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
export function formatDate(d: Date, fmt: DateFormat): string {
  const dd = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  switch (fmt) {
    case 'yyyy-MM-dd':
      return `${yyyy}-${MM}-${dd}`;
    case 'MM/dd/yyyy':
      return `${MM}/${dd}/${yyyy}`;
    case 'dd/MM/yyyy':
      return `${dd}/${MM}/${yyyy}`;
    default:
      return `${dd}-${MM}-${yyyy}`;
  }
}
export function formatIso(iso: string, fmt: DateFormat): string {
  const d = fromIsoDate(iso);
  return d ? formatDate(d, fmt) : iso;
}
export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}
/** Next Monday–Friday after the given date. */
export function nextWorkday(d: Date): Date {
  let r = addDays(d, 1);
  while (r.getDay() === 0 || r.getDay() === 6) r = addDays(r, 1);
  return r;
}

const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export function weekday(iso: string, lang: 'en' | 'nl'): string {
  const d = fromIsoDate(iso);
  if (!d) return '';
  return (lang === 'nl' ? DAYS_NL : DAYS_EN)[d.getDay()];
}
