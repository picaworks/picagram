"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type MarginJournalProps } from "./core";

export type MarginJournalComponentProps = Partial<MarginJournalProps> & WrapperProps;

/** An essay publication with a narrow marginalia column, a large initial and linked endnotes. */
export function MarginJournal({ className, style, palette, ...props }: MarginJournalComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
