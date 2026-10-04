"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiLibraryCatalogProps, type AsciiLibraryCatalogEvents } from "./core";
export type AsciiLibraryCatalogComponentProps = Partial<AsciiLibraryCatalogProps> & WrapperProps & Handlers<AsciiLibraryCatalogEvents>;
/** A reading collection with a character bookshelf, selectable catalogue rows, useful book notes and a curated reading route. */
export function AsciiLibraryCatalog({ className, style, palette, ...props }: AsciiLibraryCatalogComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
