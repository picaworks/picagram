"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type TimecodeEditorEvents, type TimecodeEditorProps } from "./core";

export type TimecodeEditorComponentProps = Partial<TimecodeEditorProps> & Handlers<TimecodeEditorEvents> & WrapperProps;

/** A compact native timecode editor with frame-rate-aware carrying between four segments. */
export function TimecodeEditor({ className, style, palette, ...props }: TimecodeEditorComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
