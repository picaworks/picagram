"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EventScheduleProps } from "./core";

export type EventScheduleComponentProps = Partial<EventScheduleProps> & WrapperProps & { children?: ReactNode };

/** An event agenda grouped by day, with each session's time, title, speaker, and place as plain text. */
export function EventSchedule({ className, style, palette, children, ...props }: EventScheduleComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
