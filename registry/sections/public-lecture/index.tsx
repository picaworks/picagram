"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PublicLectureProps } from "./core";
export type PublicLectureComponentProps = Partial<PublicLectureProps> & WrapperProps;
/** A public lecture page with an annotated argument diagram, a thesis, a timed programme, and reservation information. */
export function PublicLecture({ className, style, palette, ...props }: PublicLectureComponentProps) {
    const ref = usePica(mount, props);
    return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}/>;
}
