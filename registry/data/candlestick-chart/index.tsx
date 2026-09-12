"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CandlestickChartProps } from "./core";

export type CandlestickChartComponentProps = Partial<CandlestickChartProps> & WrapperProps;

/** Price series drawn as hollow or filled candles, with high and low wicks. */
export function CandlestickChart({ className, style, palette, ...props }: CandlestickChartComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
