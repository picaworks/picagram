/** Time on a chart's axis: reading it in, choosing round calendar ticks, and printing those ticks. Every
 *  step of it works in UTC, so the React file and the HTML file put the same labels under the same points on
 *  every machine, whatever zone the reader sits in. */

/** The size of step a time axis is stepping by, which decides how a tick reads. */
export type TimeUnit = "hour" | "day" | "month" | "year";

export interface TimeTicks {
  /** The tick times, in UTC milliseconds. */
  readonly times: number[];
  /** The step the ticks landed on, which formatTime prints for. */
  readonly unit: TimeUnit;
}

const TIME_HOUR_MS = 3_600_000;
const TIME_DAY_MS = 24 * TIME_HOUR_MS;
/** A month's average length, for comparing a calendar step with a fixed one. */
const TIME_MONTH_MS = 2_629_800_000;

/** The steps an axis may use, smallest first. A step is milliseconds under the hour and day units, and whole
 *  months under the month and year units, whose length depends on where in the calendar they fall. */
const TIME_STEPS: readonly (readonly [number, TimeUnit])[] = [
  [TIME_HOUR_MS, "hour"],
  [2 * TIME_HOUR_MS, "hour"],
  [3 * TIME_HOUR_MS, "hour"],
  [6 * TIME_HOUR_MS, "hour"],
  [12 * TIME_HOUR_MS, "hour"],
  [TIME_DAY_MS, "day"],
  [2 * TIME_DAY_MS, "day"],
  [7 * TIME_DAY_MS, "day"],
  [14 * TIME_DAY_MS, "day"],
  [1, "month"],
  [3, "month"],
  [6, "month"],
  [12, "year"],
  [24, "year"],
  [60, "year"],
  [120, "year"],
];

/** An ISO date and time carrying no zone, which the language reads as local time and a chart reads as UTC. */
const TIME_ZONELESS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;

/** A time as UTC milliseconds, from an ISO 8601 string or from milliseconds, and NaN from anything else. A
 *  string with no zone is read as UTC rather than as the reader's own zone, so a series lands on the same
 *  points everywhere. Five digits or more with nothing else is milliseconds, where four is the year. */
export function parseTime(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  const text = value.trim();
  if (/^-?\d{5,}$/.test(text)) return Number(text);
  return Date.parse(TIME_ZONELESS.test(text) ? `${text.replace(" ", "T")}Z` : text);
}

/** How long a step runs, on average, in milliseconds. */
function timeStepMs(step: readonly [number, TimeUnit]): number {
  return step[1] === "hour" || step[1] === "day" ? step[0] : step[0] * TIME_MONTH_MS;
}

/** About `count` ticks across [min, max] in UTC milliseconds, on the roundest calendar step that fits: an
 *  hour, three hours, a day, a fortnight, a month, a year, ten years, and the sizes between them. Ticks sit
 *  on the boundary the step names, so a monthly axis ticks on the first of the month. A range shorter than
 *  an hour ticks by the hour, and one longer than ten years times `count` simply takes more ticks. */
export function timeTicks(min: number, max: number, count = 5): TimeTicks {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { times: [], unit: "day" };
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (lo === hi) {
    lo -= TIME_HOUR_MS;
    hi += TIME_HOUR_MS;
  }
  let picked: readonly [number, TimeUnit] = [TIME_HOUR_MS, "hour"];
  for (const candidate of TIME_STEPS) {
    picked = candidate;
    if ((hi - lo) / timeStepMs(candidate) <= Math.max(1, count)) break;
  }
  const [step, unit] = picked;
  const times: number[] = [];
  if (unit === "hour" || unit === "day") {
    // The epoch is UTC midnight, so a whole number of hours or days from it already lands on the boundary.
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) times.push(t);
  } else {
    const from = new Date(lo);
    const first = Math.floor((from.getUTCFullYear() * 12 + from.getUTCMonth()) / step) * step;
    // Counting months from a year Date.UTC reads plainly, since it maps years 0 to 99 onto the 1900s.
    for (let m = first; ; m += step) {
      const t = Date.UTC(2000, m - 24_000, 1);
      if (t > hi) break;
      if (t >= lo) times.push(t);
    }
  }
  return { times, unit };
}

/** Which parts of a date each unit's label shows. */
const TIME_FIELDS: Readonly<Record<TimeUnit, Intl.DateTimeFormatOptions>> = {
  hour: { hour: "numeric", minute: "2-digit" },
  day: { month: "short", day: "numeric" },
  month: { month: "short", year: "numeric" },
  year: { year: "numeric" },
};

const timeFormats = new Map<string, Intl.DateTimeFormat>();

/** A tick time as its label, in the viewer's locale unless one is given, and always read in UTC. */
export function formatTime(time: number, unit: TimeUnit, locale?: string): string {
  const key = `${locale ?? ""}|${unit}`;
  let format = timeFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { ...TIME_FIELDS[unit], timeZone: "UTC" });
    timeFormats.set(key, format);
  }
  return format.format(time);
}
