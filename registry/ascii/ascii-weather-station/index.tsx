"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiWeatherStationProps, type AsciiWeatherStationEvents } from "./core";

export type AsciiWeatherStationComponentProps = Partial<AsciiWeatherStationProps> & WrapperProps & Handlers<AsciiWeatherStationEvents>;

/** Historical weather samples with a character wind rose, seven day rainfall plot, and readable measurements. */
export function AsciiWeatherStation({ className, style, palette, ...props }: AsciiWeatherStationComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
