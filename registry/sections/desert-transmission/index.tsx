"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type DesertTransmissionProps, type DesertTransmissionEvents } from "./core";
export type DesertTransmissionComponentProps = Partial<DesertTransmissionProps> & WrapperProps & Handlers<DesertTransmissionEvents>;
/** A fictional desert expedition archive with a horizon drawing, transcript bands, and field inventory. */
export function DesertTransmission({ className, style, palette, ...props }: DesertTransmissionComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
