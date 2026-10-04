"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiObservatoryConsoleProps, type AsciiObservatoryConsoleEvents } from "./core";
export type AsciiObservatoryConsoleComponentProps = Partial<AsciiObservatoryConsoleProps> & WrapperProps & Handlers<AsciiObservatoryConsoleEvents>;
/** An observatory notebook with a character sky diagram, selectable observation records, a session ledger and instrument notes. */
export function AsciiObservatoryConsole({ className, style, palette, ...props }: AsciiObservatoryConsoleComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
