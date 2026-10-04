"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type OrbitalLogProps, type OrbitalLogEvents } from "./core";
export type OrbitalLogComponentProps = Partial<OrbitalLogProps> & WrapperProps & Handlers<OrbitalLogEvents>;
/** A mission documentary with a circular orbital schematic, timestamped observation log, and mission notes. */
export function OrbitalLog({ className, style, palette, ...props }: OrbitalLogComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
