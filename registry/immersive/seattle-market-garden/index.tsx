"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type SeattleMarketGardenProps } from "./core";

export type SeattleMarketGardenComponentProps = Partial<SeattleMarketGardenProps> & WrapperProps;

/** Open produce stalls share an accessible cultivated terrace beneath a rolling cloth awning. */
export function SeattleMarketGarden({ className, style, palette, ...props }: SeattleMarketGardenComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
