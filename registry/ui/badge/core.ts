import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssOn, cssVar, type Token } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface BadgeProps {
  /** The status text shown by the badge. */
  text: string;
  /** The frame drawn around the status text. */
  variant: "outline" | "solid" | "brackets";
  /** The palette tone used for the frame or fill. */
  tone: "fg" | "muted" | "accent";
}

export const defaults: BadgeProps = {
  text: "STABLE",
  variant: "outline",
  tone: "accent",
};

function badgeRules(selector: string, props: BadgeProps): string {
  const tone: Token = props.tone;
  const frame = cssVar(tone);
  const fg = cssVar("fg");
  const look: Record<BadgeProps["variant"], string[]> = {
    outline: ["background:transparent", `border:1px solid ${frame}`, `color:${fg}`, "padding:0.36em 0.58em"],
    solid: [`background:${frame}`, `border:1px solid ${frame}`, `color:${cssOn(tone)}`, "padding:0.36em 0.58em"],
    brackets: ["background:transparent", "border:0", `color:${fg}`, "padding:0"],
  };
  const base = [
    "box-sizing:border-box",
    "display:inline-block",
    "width:max-content",
    "max-width:100%",
    "margin:0",
    `font-family:${GRID_FONT}`,
    "font-size:0.75em",
    "font-weight:600",
    "line-height:1",
    "letter-spacing:0.08em",
    "text-transform:uppercase",
    "white-space:nowrap",
    "vertical-align:middle",
    "border-radius:0",
    "cursor:default",
  ];
  return [
    `${selector}{${[...base, ...look[props.variant]].join(";")}}`,
    ...(props.variant === "brackets"
      ? [
          `${selector}::before{content:"[";color:${frame};margin-right:0.32em}`,
          `${selector}::after{content:"]";color:${frame};margin-left:0.24em}`,
        ]
      : []),
  ].join("\n");
}

export const mount: Mount<BadgeProps> = (host, initial = {}) => {
  let props: BadgeProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const label = document.createElement("span");
  label.setAttribute("data-pica", "");
  host.append(label);

  function apply(): void {
    label.textContent = props.text;
    sheet.setRules(badgeRules(sheet.selector, props));
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      label.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
