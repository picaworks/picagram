"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ArchitectDossierProps } from "./core";

export type ArchitectDossierComponentProps = Partial<ArchitectDossierProps> & WrapperProps;

/** An architectural project dossier with original plan drawings, marginal specifications, and design notes. */
export function ArchitectDossier({ className, style, palette, ...props }: ArchitectDossierComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
