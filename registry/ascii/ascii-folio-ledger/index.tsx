"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type AsciiFolioLedgerProps } from "./core";
export type AsciiFolioLedgerComponentProps = Partial<AsciiFolioLedgerProps> & WrapperProps;
/** A portfolio ledger with a character index, open project register, case disclosures and a practical contact brief. */
export function AsciiFolioLedger({ className, style, palette, ...props }: AsciiFolioLedgerComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
