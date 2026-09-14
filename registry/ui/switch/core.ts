import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssOn, cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface SwitchProps {
  /** The current state. Null leaves the switch uncontrolled. */
  checked: boolean | null;
  /** The initial state when the switch is uncontrolled. */
  defaultChecked: boolean;
  /** The visible name beside the switch. */
  label: string;
  /** Shows a small On or Off value after the label. */
  showState: boolean;
  /** Blocks input and dims the switch. */
  disabled: boolean;
}

export interface SwitchEvents {
  /** The user requested a new checked state. */
  checkedChange: boolean;
}

export const defaults: SwitchProps = {
  checked: null,
  defaultChecked: false,
  label: "Grid lines",
  showState: true,
  disabled: false,
};

/** Scoped rules for the switch, its visible label, and its state value. */
function switchRules(s: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  const control = `${s} [data-pica-switch]`;
  return [
    `${s} [data-pica-group]{display:inline-flex;align-items:center;gap:0.65em;color:${fg};font:inherit}`,
    `${control}{--pica-switch-thumb:${fg};appearance:none;box-sizing:border-box;width:2.2em;height:1.1em;margin:0;padding:0.14em;display:flex;align-items:center;justify-content:flex-start;border:1px solid ${fg};border-radius:0;background:transparent;color:inherit;font:inherit;cursor:pointer}`,
    `${control}[aria-checked="true"]{--pica-switch-thumb:${cssOn("accent")};justify-content:flex-end;border-color:${accent};background:${accent}}`,
    `${control}:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${control}:disabled{cursor:not-allowed}`,
    `${control}:hover:not(:disabled) [data-pica-thumb]{background:color-mix(in srgb,var(--pica-switch-thumb) 90%,${fg})}`,
    `${s} [data-pica-group][data-pica-disabled="true"]{opacity:0.45}`,
    `${s} [data-pica-thumb]{display:block;width:0.68em;height:0.68em;flex:0 0 0.68em;background:var(--pica-switch-thumb)}`,
    `${s} [data-pica-copy]{display:inline-flex;align-items:baseline;gap:0.55em;line-height:1.25}`,
    `${s} [data-pica-state]{color:${muted};font-family:${GRID_FONT};font-size:0.72em;letter-spacing:0.04em}`,
  ].join("\n");
}

export const mount: Mount<SwitchProps> = (host, initial = {}) => {
  let props: SwitchProps = { ...defaults, ...initial };
  let value = props.checked ?? props.defaultChecked;
  const emit = emitter<SwitchEvents>(host);
  const sheet = scope(host);
  const group = document.createElement("span");
  const button = document.createElement("button");
  const thumb = document.createElement("span");
  const copy = document.createElement("span");
  const label = document.createElement("span");
  const state = document.createElement("span");
  const labelId = nextId("pica-switch-label");

  group.setAttribute("data-pica", "");
  group.setAttribute("data-pica-group", "");
  button.setAttribute("data-pica", "");
  button.setAttribute("data-pica-switch", "");
  button.type = "button";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-labelledby", labelId);
  thumb.setAttribute("data-pica", "");
  thumb.setAttribute("data-pica-thumb", "");
  thumb.setAttribute("aria-hidden", "true");
  copy.setAttribute("data-pica", "");
  copy.setAttribute("data-pica-copy", "");
  label.setAttribute("data-pica", "");
  label.id = labelId;
  state.setAttribute("data-pica", "");
  state.setAttribute("data-pica-state", "");
  state.setAttribute("aria-hidden", "true");
  button.append(thumb);
  copy.append(label, state);
  group.append(button, copy);
  host.append(group);
  sheet.setRules(switchRules(sheet.selector));

  function shown(): boolean {
    return props.checked ?? value;
  }

  function apply(): void {
    const checked = shown();
    button.setAttribute("aria-checked", String(checked));
    button.disabled = props.disabled;
    group.setAttribute("data-pica-disabled", String(props.disabled));
    label.textContent = props.label;
    state.textContent = checked ? "On" : "Off";
    state.hidden = !props.showState;
  }

  const onClick = (): void => {
    if (props.disabled) return;
    const next = !shown();
    if (props.checked === null) {
      value = next;
      apply();
    }
    emit("checkedChange", next);
  };
  button.addEventListener("click", onClick);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = shown();
      const wasControlled = props.checked !== null;
      props = { ...props, ...next };
      if (props.checked !== null) value = props.checked;
      else if (wasControlled) value = before;
      apply();
    },
    destroy() {
      button.removeEventListener("click", onClick);
      group.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
