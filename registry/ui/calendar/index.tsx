"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CalendarEvents, type CalendarProps } from "./core";

export type CalendarComponentProps = Partial<CalendarProps> & Handlers<CalendarEvents> & WrapperProps;

/** A keyboard navigable month grid for choosing one date. */
export function Calendar({ className, style, palette, ...props }: CalendarComponentProps) {
  const ref = usePica<CalendarProps>(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
