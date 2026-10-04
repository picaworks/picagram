"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiLoomDraftEvents, type AsciiLoomDraftProps } from "./core";

export type AsciiLoomDraftComponentProps = Partial<AsciiLoomDraftProps> & Handlers<AsciiLoomDraftEvents> & WrapperProps;

/** A weaving draft in glyphs: toggle a tie-up cell and the woven repeat redraws its crossings. */
export function AsciiLoomDraft({ className, style, palette, ...props }: AsciiLoomDraftComponentProps) {
  const ref = usePica<AsciiLoomDraftProps>(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
