"use client";
import { paletteStyle, usePica, type WrapperProps, type Handlers } from "../../../lib/use-pica";
import { mount, type AsciiPacketRouteProps, type AsciiPacketRouteEvents } from "./core";

export type AsciiPacketRouteComponentProps = Partial<AsciiPacketRouteProps> & WrapperProps & Handlers<AsciiPacketRouteEvents>;

/** A supplied network route drawn as a character hop map with selectable latency records and an ordered route. */
export function AsciiPacketRoute({ className, style, palette, ...props }: AsciiPacketRouteComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
