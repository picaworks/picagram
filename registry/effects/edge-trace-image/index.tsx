"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type EdgeTraceImageProps } from "./core";

export type EdgeTraceImageComponentProps = Partial<EdgeTraceImageProps> & WrapperProps;

/** A photograph reduced to its outlines, traced from the Sobel gradient and kept by Canny's thresholds. */
export function EdgeTraceImage({ className, style, palette, ...props }: EdgeTraceImageComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
