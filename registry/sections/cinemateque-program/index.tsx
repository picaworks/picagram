"use client";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type CinematequeProgramProps } from "./core";

export type CinematequeProgramComponentProps = Partial<CinematequeProgramProps> & WrapperProps;

/** A repertory cinema program with an oversized screening date, asymmetric schedule, and projection notes. */
export function CinematequeProgram({ className, style, palette, ...props }: CinematequeProgramComponentProps) {
  const ref = usePica(mount, props);
  return <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }} />;
}
