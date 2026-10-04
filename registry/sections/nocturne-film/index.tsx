"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type NocturneFilmProps, type NocturneFilmEvents } from "./core";
export type NocturneFilmComponentProps = Partial<NocturneFilmProps> & WrapperProps & Handlers<NocturneFilmEvents>;
/** A fictional noir screening page with a tall typographic poster, screening programme, and film credits. */
export function NocturneFilm({ className, style, palette, ...props }: NocturneFilmComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
