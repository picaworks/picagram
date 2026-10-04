"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiTerminalJournalProps } from "./core";
export type AsciiTerminalJournalComponentProps = Partial<AsciiTerminalJournalProps> & WrapperProps;
/** An authored reading page with a text mode masthead, chapter links, margin observations and a field note prompt. */
export function AsciiTerminalJournal({ className, style, palette, ...props }: AsciiTerminalJournalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
