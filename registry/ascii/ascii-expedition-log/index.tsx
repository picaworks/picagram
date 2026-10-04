"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiExpeditionLogProps } from "./core";
export type AsciiExpeditionLogComponentProps = Partial<AsciiExpeditionLogProps> & WrapperProps;
/** An expedition dossier with an elevation transect, field observations and a working supply checklist. */
export function AsciiExpeditionLog({ className, style, palette, ...props }: AsciiExpeditionLogComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
