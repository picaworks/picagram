import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CalendarProps {
  /** The selected ISO date, or null to let the calendar manage its selection. */
  value: string | null;
  /** The initially selected ISO date when value is null. */
  defaultValue: string;
  /** The initially visible month as YYYY-MM, or null to derive it from the selection or today. */
  month: string | null;
  /** The first day of each week, where 0 is Sunday and 1 is Monday. */
  weekStartsOn: 0 | 1;
  /** The accessible name of the calendar group. */
  label: string;
}

export interface CalendarEvents {
  /** A day was chosen, as an ISO date string. */
  valueChange: string;
}

export const defaults: CalendarProps = {
  value: null,
  defaultValue: "",
  month: null,
  weekStartsOn: 1,
  label: "Calendar",
};

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const CALENDAR_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const CALENDAR_WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

function calendarParseDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function calendarParseMonth(value: string | null): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return month >= 0 && month < 12 ? { year, month, day: 1 } : null;
}

function calendarToday(): CalendarDate {
  const date = new Date();
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

function calendarFromUtc(date: Date): CalendarDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

function calendarAddDays(date: CalendarDate, amount: number): CalendarDate {
  return calendarFromUtc(new Date(Date.UTC(date.year, date.month, date.day + amount)));
}

function calendarDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function calendarShiftMonth(date: CalendarDate, amount: number): CalendarDate {
  const anchor = new Date(Date.UTC(date.year, date.month + amount, 1));
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  return { year, month, day: Math.min(date.day, calendarDaysInMonth(year, month)) };
}

function calendarIso(date: CalendarDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month + 1).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function calendarSameDate(a: CalendarDate | null, b: CalendarDate): boolean {
  return a !== null && a.year === b.year && a.month === b.month && a.day === b.day;
}

function calendarRules(selector: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const mono = GRID_FONT;
  return [
    `${selector}{display:inline-block;color:${fg};font:inherit;box-sizing:border-box}`,
    `${selector} [data-calendar-part="root"]{width:21rem;max-width:100%;box-sizing:border-box}`,
    `${selector} [data-calendar-part="header"]{display:grid;grid-template-columns:2.25rem 1fr 2.25rem;align-items:center;gap:.5rem;margin-block-end:.7rem}`,
    `${selector} [data-calendar-part="heading"]{margin:0;text-align:center;font:inherit;font-size:.75em;line-height:1.3;letter-spacing:.04em;text-transform:uppercase}`,
    `${selector} [data-calendar-part="move"]{appearance:none;width:2.25rem;height:2.25rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${fg};font-family:${mono};font-size:1em;line-height:1;cursor:pointer}`,
    `${selector} [data-calendar-part="move"]:hover{color:${accent}}`,
    `${selector} button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-calendar-part="grid"]{font-family:${mono};font-variant-numeric:tabular-nums}`,
    `${selector} [data-calendar-part="week"],${selector} [data-calendar-part="row"]{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));align-items:center}`,
    `${selector} [data-calendar-part="week"]{padding-block:.35rem .55rem;border-bottom:1px solid ${muted};color:${muted};font-size:.75em;letter-spacing:.04em;text-transform:uppercase}`,
    `${selector} [data-calendar-part="weekday"]{text-align:center}`,
    `${selector} [data-calendar-part="days"]{padding-block-start:.4rem;font-size:.8em}`,
    `${selector} [data-calendar-part="row"]+[data-calendar-part="row"]{margin-block-start:.15rem}`,
    `${selector} [data-calendar-part="cell"]{display:grid;place-items:center;min-width:0;height:2.5rem}`,
    `${selector} [data-calendar-part="day"]{appearance:none;width:2.25rem;height:2.25rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;cursor:pointer;text-underline-offset:.2em;text-decoration-thickness:1px}`,
    `${selector} [data-calendar-part="day"]:hover{background:color-mix(in srgb,${fg} 10%,transparent)}`,
    `${selector} [data-calendar-today="true"]{text-decoration-line:underline;text-decoration-color:${accent}}`,
    `${selector} [data-calendar-selected="true"],${selector} [data-calendar-selected="true"]:hover{background:${accent};color:${cssOn("accent")}}`,
  ].join("\n");
}

export const mount: Mount<CalendarProps> = (host, initial = {}) => {
  let props: CalendarProps = { ...defaults, ...initial };
  const emit = emitter<CalendarEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const today = calendarToday();
  let selected = calendarParseDate(props.value ?? props.defaultValue);
  let visible = calendarParseMonth(props.month) ?? calendarParseDate(props.value ?? "") ?? today;
  let focusDate = selected && selected.year === visible.year && selected.month === visible.month
    ? selected
    : today.year === visible.year && today.month === visible.month ? today : { ...visible, day: 1 };

  const owned = (tag: string): HTMLElement => {
    const element = document.createElement(tag);
    element.setAttribute("data-pica", "");
    return element;
  };

  const root = owned("div");
  root.setAttribute("data-calendar-part", "root");
  const header = owned("div");
  header.setAttribute("data-calendar-part", "header");
  const previous = owned("button") as HTMLButtonElement;
  previous.type = "button";
  previous.setAttribute("data-calendar-part", "move");
  previous.setAttribute("aria-label", "Previous month");
  previous.tabIndex = -1;
  previous.textContent = "←";
  const heading = owned("h2");
  const headingId = nextId("pica-calendar-month");
  heading.id = headingId;
  heading.setAttribute("data-calendar-part", "heading");
  heading.setAttribute("aria-live", "polite");
  heading.setAttribute("aria-atomic", "true");
  const next = owned("button") as HTMLButtonElement;
  next.type = "button";
  next.setAttribute("data-calendar-part", "move");
  next.setAttribute("aria-label", "Next month");
  next.tabIndex = -1;
  next.textContent = "→";
  header.append(previous, heading, next);

  const grid = owned("div");
  grid.setAttribute("data-calendar-part", "grid");
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-labelledby", headingId);
  const week = owned("div");
  week.setAttribute("data-calendar-part", "week");
  week.setAttribute("role", "row");
  const days = owned("div");
  days.setAttribute("data-calendar-part", "days");
  grid.append(week, days);
  root.append(header, grid);
  host.append(root);

  function renderWeekdays(): void {
    week.replaceChildren();
    const start = props.weekStartsOn === 0 ? 0 : 1;
    for (let index = 0; index < 7; index++) {
      const weekdayIndex = (start + index) % 7;
      const name = CALENDAR_WEEKDAY_NAMES[weekdayIndex] ?? "";
      const cell = owned("div");
      cell.setAttribute("data-calendar-part", "weekday");
      cell.setAttribute("role", "columnheader");
      cell.setAttribute("aria-label", name);
      cell.textContent = name.slice(0, 2);
      week.append(cell);
    }
  }

  function renderDays(focusAfter = false): void {
    heading.textContent = `${CALENDAR_MONTH_NAMES[visible.month] ?? ""} ${visible.year}`;
    days.replaceChildren();
    const firstWeekday = new Date(Date.UTC(visible.year, visible.month, 1)).getUTCDay();
    const start = props.weekStartsOn === 0 ? 0 : 1;
    const offset = (firstWeekday - start + 7) % 7;
    const count = calendarDaysInMonth(visible.year, visible.month);
    const cells = Math.ceil((offset + count) / 7) * 7;
    let focusTarget: HTMLButtonElement | null = null;

    for (let cellIndex = 0; cellIndex < cells; cellIndex += 7) {
      const row = owned("div");
      row.setAttribute("data-calendar-part", "row");
      row.setAttribute("role", "row");
      for (let column = 0; column < 7; column++) {
        const dayNumber = cellIndex + column - offset + 1;
        const cell = owned("div");
        cell.setAttribute("data-calendar-part", "cell");
        cell.setAttribute("role", "gridcell");
        if (dayNumber >= 1 && dayNumber <= count) {
          const date = { year: visible.year, month: visible.month, day: dayNumber };
          const isSelected = calendarSameDate(selected, date);
          const isToday = calendarSameDate(today, date);
          const isFocus = calendarSameDate(focusDate, date);
          const button = owned("button") as HTMLButtonElement;
          button.type = "button";
          button.setAttribute("data-calendar-part", "day");
          button.setAttribute("data-calendar-date", calendarIso(date));
          button.setAttribute("data-calendar-today", String(isToday));
          button.setAttribute("data-calendar-selected", String(isSelected));
          button.setAttribute("aria-label", `${CALENDAR_WEEKDAY_NAMES[new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()]}, ${CALENDAR_MONTH_NAMES[date.month]} ${date.day}, ${date.year}`);
          button.tabIndex = isFocus ? 0 : -1;
          button.textContent = String(dayNumber);
          cell.setAttribute("aria-selected", String(isSelected));
          if (isToday) button.setAttribute("aria-current", "date");
          if (isFocus) focusTarget = button;
          cell.append(button);
        }
        row.append(cell);
      }
      days.append(row);
    }
    if (focusAfter) focusTarget?.focus();
  }

  function render(focusAfter = false): void {
    renderWeekdays();
    renderDays(focusAfter);
  }

  function moveFocus(date: CalendarDate): void {
    focusDate = date;
    visible = { year: date.year, month: date.month, day: 1 };
    render(true);
  }

  function choose(date: CalendarDate): void {
    if (props.value === null) {
      selected = date;
      focusDate = date;
      render(true);
    }
    emit("valueChange", calendarIso(date));
  }

  const onPrevious = (): void => {
    visible = calendarShiftMonth(focusDate, -1);
    focusDate = visible;
    render();
  };
  const onNext = (): void => {
    visible = calendarShiftMonth(focusDate, 1);
    focusDate = visible;
    render();
  };
  const onGridClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button[data-calendar-date]");
    if (!(button instanceof HTMLButtonElement) || !grid.contains(button)) return;
    const date = calendarParseDate(button.getAttribute("data-calendar-date") ?? "");
    if (date) choose(date);
  };
  const onGridKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.hasAttribute("data-calendar-date")) return;
    let destination: CalendarDate | null = null;
    if (event.key === "ArrowLeft") destination = calendarAddDays(focusDate, -1);
    else if (event.key === "ArrowRight") destination = calendarAddDays(focusDate, 1);
    else if (event.key === "ArrowUp") destination = calendarAddDays(focusDate, -7);
    else if (event.key === "ArrowDown") destination = calendarAddDays(focusDate, 7);
    else if (event.key === "Home") {
      const weekday = new Date(Date.UTC(focusDate.year, focusDate.month, focusDate.day)).getUTCDay();
      destination = calendarAddDays(focusDate, -((weekday - (props.weekStartsOn === 0 ? 0 : 1) + 7) % 7));
    } else if (event.key === "End") {
      const weekday = new Date(Date.UTC(focusDate.year, focusDate.month, focusDate.day)).getUTCDay();
      destination = calendarAddDays(focusDate, 6 - ((weekday - (props.weekStartsOn === 0 ? 0 : 1) + 7) % 7));
    } else if (event.key === "PageUp") destination = calendarShiftMonth(focusDate, event.shiftKey ? -12 : -1);
    else if (event.key === "PageDown") destination = calendarShiftMonth(focusDate, event.shiftKey ? 12 : 1);
    if (!destination) return;
    event.preventDefault();
    moveFocus(destination);
  };

  previous.addEventListener("click", onPrevious);
  next.addEventListener("click", onNext);
  grid.addEventListener("click", onGridClick);
  grid.addEventListener("keydown", onGridKeydown);

  attrs.set("role", "group");
  attrs.set("aria-label", props.label);
  sheet.setRules(calendarRules(sheet.selector));
  render();
  host.dataset.picaReady = "true";

  return {
    update(partial) {
      const priorValue = props.value;
      const priorMonth = props.month;
      const priorWeekStart = props.weekStartsOn;
      props = { ...props, ...partial };
      attrs.set("aria-label", props.label);
      if (props.value !== priorValue && props.value !== null) {
        selected = calendarParseDate(props.value);
        if (selected && props.month === null) {
          visible = { ...selected, day: 1 };
          focusDate = selected;
        }
      }
      if (props.month !== priorMonth) {
        const explicit = calendarParseMonth(props.month);
        if (explicit) {
          visible = explicit;
          focusDate = { ...explicit, day: Math.min(focusDate.day, calendarDaysInMonth(explicit.year, explicit.month)) };
        }
      }
      if (props.weekStartsOn !== priorWeekStart || props.value !== priorValue || props.month !== priorMonth) render();
    },
    destroy() {
      previous.removeEventListener("click", onPrevious);
      next.removeEventListener("click", onNext);
      grid.removeEventListener("click", onGridClick);
      grid.removeEventListener("keydown", onGridKeydown);
      root.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
