"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ReadingRoomProps } from "./core";

export type ReadingRoomComponentProps = Partial<ReadingRoomProps> & WrapperProps;

/** A quiet reading portal with a shelf index, long essay surface and annotated bibliography. */
export function ReadingRoom({ className, style, palette, ...props }: ReadingRoomComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
