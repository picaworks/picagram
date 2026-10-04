import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface AlertProps {
  /** The short label shown above the alert text. */
  tag: string;
  /** The alert heading announced to assistive technology. */
  title: string;
  /** The supporting status message announced to assistive technology. */
  message: string;
  /** The treatment of the tag or the complete callout. */
  tone: "neutral" | "muted" | "accent" | "filled";
}

export const defaults: AlertProps = {
  tag: "note",
  title: "Build finished",
  message: "All 24 components verified on both grounds.",
  tone: "accent",
};

function alertRules(selector: string, tone: AlertProps["tone"]): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const onAccent = cssOn("accent");
  const filled = tone === "filled";
  const surface = filled ? `background:${accent};color:${onAccent};border-color:${onAccent}` : `background:transparent;color:${fg};border-color:${fg}`;
  const tagLooks: Readonly<Record<AlertProps["tone"], string>> = {
    neutral: `color:${fg};background:transparent;border-color:${fg}`,
    muted: `color:${muted};background:transparent;border-color:transparent`,
    accent: `color:${onAccent};background:${accent};border-color:${accent}`,
    filled: `color:${onAccent};background:transparent;border-color:${onAccent}`,
  };
  return [
    `:where(${selector}){min-height:min-content}`,
    `${selector}{box-sizing:border-box;width:100%;display:flex;align-items:center}`,
    `${selector}>[data-pica-part="body"]{${surface};box-sizing:border-box;width:100%;display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:start;gap:1.25em;border-style:solid;border-width:1px 0;padding:1.25em 0.25em;line-height:1.35}`,
    `${selector} [data-pica-part="body"]>[data-pica-part="tag"]{${tagLooks[tone]};box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:4.75em;padding:0.35em 0.55em;border:1px solid transparent;font-family:${GRID_FONT};font-size:0.72em;font-weight:600;line-height:1;text-transform:uppercase;letter-spacing:0.08em}`,
    `${selector} [data-pica-part="body"]>[data-pica-part="copy"]{display:grid;gap:0.35em;min-width:0}`,
    `${selector} [data-pica-part="title"]{font:inherit;font-weight:600;line-height:1.2}`,
    `${selector} [data-pica-part="message"]{color:${filled ? onAccent : muted};font:inherit;line-height:1.45}`,
    `@media(max-width:520px){${selector}>[data-pica-part="body"]{grid-template-columns:1fr;gap:0.85em;padding:1em 0.15em}${selector} [data-pica-part="tag"]{justify-self:start}}`,
  ].join("\n");
}

function alertPart(name: string, tagName = "div"): HTMLElement {
  const element = document.createElement(tagName);
  element.setAttribute("data-pica", "");
  element.setAttribute("data-pica-part", name);
  return element;
}

export const mount: Mount<AlertProps> = (host, initial = {}) => {
  let props: AlertProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const body = alertPart("body");
  const tag = alertPart("tag", "span");
  const copy = alertPart("copy");
  const title = alertPart("title");
  const message = alertPart("message");

  copy.append(title, message);
  body.append(tag, copy);
  host.append(body);

  function apply(): void {
    attrs.set("role", "alert");
    attrs.set("aria-atomic", "true");
    tag.textContent = props.tag;
    title.textContent = props.title;
    message.textContent = props.message;
    sheet.setRules(alertRules(sheet.selector, props.tone));
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      body.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
