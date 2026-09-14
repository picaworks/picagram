import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TextareaProps {
  /** The current text, or null to let the field manage its own value. */
  value: string | null;
  /** The text read once when an uncontrolled field mounts. */
  defaultValue: string;
  /** The visible name above the field. */
  label: string;
  /** The hint shown while the field is empty. */
  placeholder: string;
  /** The greatest number of visible lines before the field scrolls. */
  maxRows: number;
  /** The suggested character limit shown below the field, or zero to hide the count. */
  max: number;
  /** Blocks editing and dims the complete control. */
  disabled: boolean;
}

export interface TextareaEvents {
  /** The field received text input. */
  valueChange: string;
}

export const defaults: TextareaProps = {
  value: null,
  defaultValue: "Shipped the palette work today.\nTwo lines in already.",
  label: "Notes",
  placeholder: "Write it down",
  maxRows: 8,
  max: 280,
  disabled: false,
};

function textareaRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `:where(${selector}){display:block;width:100%;min-height:7rem;color:${fg}}`,
    `${selector} [data-pica-shell]{box-sizing:border-box;display:grid;gap:0.5em;width:100%}`,
    `${selector} [data-pica-label]{color:${fg};font-family:${GRID_FONT};font-size:0.7em;line-height:1.2;letter-spacing:0.08em;text-transform:uppercase}`,
    `${selector} [data-pica-field]{appearance:none;box-sizing:border-box;display:block;width:100%;min-height:0;margin:0;padding:0.7em 0.8em;border:1px solid ${muted};border-radius:0;outline:none;background:transparent;color:${fg};font:inherit;line-height:1.5;resize:none;overflow-y:hidden}`,
    `${selector} [data-pica-field]::placeholder{color:${muted};opacity:1}`,
    `${selector} [data-pica-field]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-shell][data-disabled="true"]{opacity:0.45}`,
    `${selector} [data-pica-field]:disabled{cursor:not-allowed}`,
    `${selector} [data-pica-footer]{display:flex;align-items:center;gap:0.75em;min-height:1em;color:${muted};font-family:${GRID_FONT};font-size:0.72em;line-height:1;letter-spacing:0.04em;font-variant-numeric:tabular-nums}`,
    `${selector} [data-pica-footer]::before{content:"";flex:1;border-top:1px solid ${muted}}`,
    `${selector} [data-pica-count][data-over="true"]{color:${fg}}`,
  ].join("\n");
}

function textareaRows(value: number): number {
  return Number.isFinite(value) ? Math.max(2, Math.min(16, Math.round(value))) : defaults.maxRows;
}

function textareaLimit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function sizeTextarea(field: HTMLTextAreaElement, maxRows: number): void {
  field.style.height = "auto";
  const style = getComputedStyle(field);
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.5;
  const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const border = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
  const cap = lineHeight * textareaRows(maxRows) + padding + border;
  const needed = field.scrollHeight + border;
  field.style.height = `${Math.min(needed, cap)}px`;
  field.style.overflowY = needed > cap + 0.5 ? "auto" : "hidden";
}

export const mount: Mount<TextareaProps> = (host, initial = {}) => {
  let props: TextareaProps = { ...defaults, ...initial };
  let uncontrolledValue = props.defaultValue;
  const emit = emitter<TextareaEvents>(host);
  const sheet = scope(host);
  const shell = document.createElement("div");
  const label = document.createElement("label");
  const field = document.createElement("textarea");
  const footer = document.createElement("div");
  const count = document.createElement("span");
  const fieldId = nextId("pica-textarea");
  const countId = nextId("pica-textarea-count");

  shell.setAttribute("data-pica", "");
  shell.setAttribute("data-pica-shell", "");
  label.setAttribute("data-pica", "");
  label.setAttribute("data-pica-label", "");
  label.htmlFor = fieldId;
  field.setAttribute("data-pica", "");
  field.setAttribute("data-pica-field", "");
  field.id = fieldId;
  field.rows = 1;
  footer.setAttribute("data-pica", "");
  footer.setAttribute("data-pica-footer", "");
  count.setAttribute("data-pica", "");
  count.setAttribute("data-pica-count", "");
  count.id = countId;
  footer.append(count);
  shell.append(label, field);
  host.append(shell);
  sheet.setRules(textareaRules(sheet.selector));

  function present(): void {
    const limit = textareaLimit(props.max);
    const shown = props.value === null ? uncontrolledValue : props.value;
    if (field.value !== shown) field.value = shown;
    label.textContent = props.label;
    field.placeholder = props.placeholder;
    field.disabled = props.disabled;
    shell.toggleAttribute("data-disabled", props.disabled);
    if (limit > 0) {
      if (!footer.isConnected) shell.append(footer);
      field.setAttribute("aria-describedby", countId);
      count.textContent = `${field.value.length} / ${limit}`;
      count.toggleAttribute("data-over", field.value.length > limit);
    } else {
      field.removeAttribute("aria-describedby");
      footer.remove();
    }
    sizeTextarea(field, props.maxRows);
  }

  const onInput = (): void => {
    const next = field.value;
    if (props.value === null) uncontrolledValue = next;
    emit("valueChange", next);
    present();
  };
  field.addEventListener("input", onInput);

  present();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      present();
    },
    destroy() {
      field.removeEventListener("input", onInput);
      shell.remove();
      sheet.destroy();
      delete host.dataset.picaReady;
    },
  };
};
