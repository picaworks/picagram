"use client";
import type { ReactNode } from "react";
import { paletteStyle, usePica, type WrapperProps } from "../../../lib/use-pica";
import { mount, type ArticleLeadProps } from "./core";

export type ArticleLeadComponentProps = Partial<ArticleLeadProps> & WrapperProps & { children?: ReactNode };

/** The opening of an article: a dateline, the page's own headline and standfirst in a reading measure, and a ruled column of facts and key points. */
export function ArticleLead({ className, style, palette, children, ...props }: ArticleLeadComponentProps) {
  const ref = usePica(mount, props);
  return (
    <div ref={ref} className={className} style={{ width: "100%", ...paletteStyle(palette), ...style }}>
      {children}
    </div>
  );
}
