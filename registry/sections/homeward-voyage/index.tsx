"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type HomewardVoyageProps, type HomewardVoyageEvents } from "./core";
export type HomewardVoyageComponentProps = Partial<HomewardVoyageProps> & WrapperProps & Handlers<HomewardVoyageEvents>;
/** A coastal return narrative with a chapter route, intimate reading column, and voyage notes. */
export function HomewardVoyage({ className, style, palette, ...props }: HomewardVoyageComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
