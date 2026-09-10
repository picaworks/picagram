"use client";
import { paletteStyle, usePica, type Handlers, type WrapperProps } from "../../../lib/use-pica";
import { mount, type KanbanBoardEvents, type KanbanBoardProps } from "./core";

export type KanbanBoardComponentProps = Partial<KanbanBoardProps> & Handlers<KanbanBoardEvents> & WrapperProps;

/** Columns of cards that move between columns by keyboard or by pointer drag. */
export function KanbanBoard({ className, style, palette, ...props }: KanbanBoardComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", height: "100%", ...paletteStyle(palette), ...style }} />;
}
