"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ForumRomeProps, type ForumRomeEvents } from "./core";
export type ForumRomeComponentProps = Partial<ForumRomeProps> & WrapperProps & Handlers<ForumRomeEvents>;
/** A Roman civic exhibition with an architectural arch, excavation ledger, and visitor notes. */
export function ForumRome({ className, style, palette, ...props }: ForumRomeComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
