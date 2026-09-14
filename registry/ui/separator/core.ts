import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface SeparatorProps {
  /** The direction of the dividing rule. */
  orientation: "horizontal" | "vertical";
  /** Optional text that breaks a horizontal rule. */
  label: string;
}

export const defaults: SeparatorProps = {
  orientation: "horizontal",
  label: "",
};

/** Scoped rules for the current direction and label state. */
function separatorRules(selector: string, props: SeparatorProps): string {
  const line = `color-mix(in srgb, ${cssVar("fg")} 24%, transparent)`;
  const label = `${selector}>[data-pica-separator-label]`;

  if (props.orientation === "vertical") {
    return [
      `${selector}{display:flex;justify-content:center;width:100%;height:100%}`,
      `${selector}::before{content:"";display:block;height:100%;border-left:1px solid ${line}}`,
      `${selector}::after,${label}{display:none}`,
    ].join("\n");
  }

  if (!props.label) {
    return [
      `${selector}{display:flex;align-items:center;width:100%;height:100%}`,
      `${selector}::before{content:"";display:block;width:100%;border-top:1px solid ${line}}`,
      `${selector}::after,${label}{display:none}`,
    ].join("\n");
  }

  return [
    `${selector}{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:1ch;width:100%;height:100%}`,
    `${selector}::before,${selector}::after{content:"";display:block;min-width:0;border-top:1px solid ${line}}`,
    `${label}{display:block;color:${cssVar("muted")};font-family:${GRID_FONT};font-size:0.7em;line-height:1;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap}`,
  ].join("\n");
}

export const mount: Mount<SeparatorProps> = (host, initial = {}) => {
  let props: SeparatorProps = { ...defaults, ...initial };
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const label = document.createElement("span");
  label.setAttribute("data-pica", "");
  label.setAttribute("data-pica-separator-label", "");
  host.append(label);

  function apply(): void {
    attrs.set("role", "separator");
    attrs.set("aria-orientation", props.orientation);
    attrs.set("tabindex", null);
    label.textContent = props.orientation === "horizontal" ? props.label : "";
    sheet.setRules(separatorRules(sheet.selector, props));
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
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
