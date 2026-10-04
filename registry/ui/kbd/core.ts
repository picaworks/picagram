import { GRID_FONT } from "../../../lib/font";
import { scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface KbdProps {
  /** The key names in the chord, shown in order. */
  keys: readonly string[];
  /** The look: "caps" draws physical key caps and "brackets" sets one bracketed monospace run. */
  variant: "caps" | "brackets";
}

export const defaults: KbdProps = {
  keys: ["⌘", "K"],
  variant: "caps",
};

function kbdRules(s: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  return [
    `${s} [data-part="run"]{display:inline-flex;align-items:baseline;gap:0.32em;vertical-align:baseline;white-space:nowrap;font-family:${GRID_FONT};font-size:0.82em;line-height:1}`,
    `${s} [data-part="key"]{display:inline-flex;box-sizing:border-box;min-width:1.8em;align-items:center;justify-content:center;padding:0.28em 0.44em;border:1px solid ${fg};border-bottom-width:2px;border-radius:0;background:transparent;color:${fg};font:inherit;line-height:1;text-transform:uppercase}`,
    `${s} [data-part="separator"]{color:${muted};font:inherit;line-height:1}`,
    `${s} [data-part="mark"]{color:${fg};font:inherit;line-height:1}`,
    `${s} [data-variant="brackets"]{gap:0.22em}`,
    `${s} [data-variant="brackets"] [data-part="key"]{min-width:0;padding:0;border:0}`,
  ].join("\n");
}

function kbdNode(tag: "kbd" | "span", part: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-part", part);
  node.textContent = text;
  return node;
}

export const mount: Mount<KbdProps> = (host, initial = {}) => {
  let props: KbdProps = { ...defaults, ...initial };
  const sheet = scope(host);
  const run = kbdNode("span", "run", "");
  host.append(run);
  sheet.setRules(kbdRules(sheet.selector));

  function draw(): void {
    run.replaceChildren();
    run.setAttribute("data-variant", props.variant);
    if (props.variant === "brackets") run.append(kbdNode("span", "mark", "["));
    props.keys.forEach((key, index) => {
      if (index > 0) run.append(kbdNode("span", "separator", "+"));
      run.append(kbdNode("kbd", "key", key.toUpperCase()));
    });
    if (props.variant === "brackets") run.append(kbdNode("span", "mark", "]"));
  }

  draw();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      draw();
    },
    destroy() {
      run.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
