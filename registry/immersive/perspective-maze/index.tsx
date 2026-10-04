"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type PerspectiveMazeEvents, type PerspectiveMazeProps } from "./core";

export type PerspectiveMazeComponentProps = Partial<PerspectiveMazeProps> & Handlers<PerspectiveMazeEvents> & WrapperProps;

/** A supplied wall grid viewed in perspective, with collision-safe keyboard and native-button navigation. */
export function PerspectiveMaze({ className, style, palette, ...props }: PerspectiveMazeComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
