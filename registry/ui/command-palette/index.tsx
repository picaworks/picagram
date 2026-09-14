"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CommandPaletteEvents, type CommandPaletteProps } from "./core";

export type CommandPaletteComponentProps = Partial<CommandPaletteProps> & Handlers<CommandPaletteEvents> & WrapperProps;

/** A modal command palette that filters a flat command list and supports keyboard and pointer selection. */
export function CommandPalette({ className, style, palette, ...props }: CommandPaletteComponentProps) {
  const ref = usePica<CommandPaletteProps, HTMLDialogElement>(mount, props);
  return <dialog ref={ref} className={className} style={{ ...paletteStyle(palette), ...style }} />;
}
