import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface CommandPaletteCommand {
  /** The value reported when the command runs. */
  id: string;
  /** The command text shown in the list. */
  label: string;
  /** Optional shortcut or supporting text shown at the right edge. */
  hint?: string;
  /** Optional words included when filtering the command. */
  keywords?: string;
}

export interface CommandPaletteProps {
  /** The flat list of commands available to filter and run. */
  commands: readonly CommandPaletteCommand[];
  /** Whether the palette is open. Null leaves its state uncontrolled. */
  open: boolean | null;
  /** Whether an uncontrolled palette starts open. */
  defaultOpen: boolean;
  /** The prompt shown in the empty input. */
  placeholder: string;
  /** The message shown when the filter has no matches. */
  emptyText: string;
  /** The accessible name for the dialog, input, and command list. */
  label: string;
  /** The palette width in rem. */
  width: number;
  /** Whether a pointer press outside the dialog closes it. */
  dismissOnBackdrop: boolean;
}

export interface CommandPaletteEvents {
  /** A command was run by keyboard or pointer. */
  command: string;
  /** The user requested a change to the open state. */
  openChange: boolean;
}

export const defaults: CommandPaletteProps = {
  commands: [
    { id: "new-component", label: "New component", hint: "⌘N", keywords: "create" },
    { id: "open-catalog", label: "Open catalog", hint: "⌘O", keywords: "browse" },
    { id: "toggle-theme", label: "Toggle theme", hint: "⌘T", keywords: "dark light" },
    { id: "copy-url", label: "Copy page URL", keywords: "link" },
    { id: "restart", label: "Restart dev server", hint: "⌘R", keywords: "serve" },
  ],
  open: null,
  defaultOpen: false,
  placeholder: "Type a command",
  emptyText: "No matching commands",
  label: "Command palette",
  width: 30,
  dismissOnBackdrop: true,
};

function commandPaletteRules(selector: string, width: number): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const muted = cssVar("muted");
  const measure = Math.min(48, Math.max(20, width));
  return [
    `${selector}{appearance:none;position:fixed;top:20vh;right:0;bottom:auto;left:0;margin:0 auto;width:min(calc(100vw - 2rem),${measure}rem)!important;height:auto!important;max-height:calc(80vh - 1rem);padding:0;overflow:hidden;box-sizing:border-box;border:1px solid color-mix(in srgb,${fg} 30%,transparent);border-radius:0;box-shadow:none;color:${fg};background:color-mix(in srgb,${fg} 4%,${cssVar("bg")})}`,
    `${selector}::backdrop{background:color-mix(in srgb,${fg} 16%,transparent)}`,
    `${selector} [data-pica-part="frame"]{display:flex;min-width:0;max-height:inherit;flex-direction:column}`,
    `${selector} [data-pica-part="prompt"]{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:0.75rem;padding:0.8rem 1rem;border-bottom:1px solid color-mix(in srgb,${fg} 24%,transparent)}`,
    `${selector} [data-pica-part="glyph"]{color:${accent};font-family:${GRID_FONT};font-weight:700;line-height:1}`,
    `${selector} [data-pica-part="input"]{width:100%;min-width:0;margin:0;padding:0;border:0;border-radius:0;outline:0;box-sizing:border-box;background:transparent;color:${fg};font:inherit;line-height:1.4;caret-color:${accent}}`,
    `${selector} [data-pica-part="input"]::placeholder{color:${muted};opacity:1}`,
    `${selector} [data-pica-part="input"]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-part="list"]{min-height:0;overflow:auto;overscroll-behavior:contain;padding:0.35rem 0}`,
    `${selector} [data-pica-part="option"]{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:1rem;padding:0.65rem 1rem;cursor:default}`,
    `${selector} [data-pica-part="option"][aria-selected="true"]{background:color-mix(in srgb,${fg} 10%,transparent)}`,
    `${selector} [data-pica-part="command-label"]{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`,
    `${selector} [data-pica-part="hint"]{color:${muted};font-family:${GRID_FONT};font-size:0.8em;white-space:nowrap}`,
    `${selector} [data-pica-part="empty"]{padding:0.8rem 1rem;color:${muted}}`,
  ].join("\n");
}

function commandPaletteNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute("data-pica", "");
  node.setAttribute("data-pica-part", part);
  return node;
}

export const mount: Mount<CommandPaletteProps> = (host, initial = {}) => {
  let props: CommandPaletteProps = { ...defaults, ...initial };
  let uncontrolledOpen = props.defaultOpen;
  let visible: readonly CommandPaletteCommand[] = props.commands;
  let active = -1;
  const dialog = host as HTMLDialogElement;
  const emit = emitter<CommandPaletteEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const listId = nextId("pica-command-list");
  const frame = commandPaletteNode("div", "frame");
  const prompt = commandPaletteNode("div", "prompt");
  const glyph = commandPaletteNode("span", "glyph");
  const input = commandPaletteNode("input", "input");
  const list = commandPaletteNode("div", "list");

  glyph.textContent = "›";
  glyph.setAttribute("aria-hidden", "true");
  input.type = "text";
  input.setAttribute("role", "combobox");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", listId);
  list.id = listId;
  list.setAttribute("role", "listbox");
  prompt.append(glyph, input);
  frame.append(prompt, list);
  host.append(frame);

  function isOpen(): boolean {
    return props.open ?? uncontrolledOpen;
  }

  function setActive(next: number): void {
    active = next;
    const options = list.querySelectorAll<HTMLElement>('[data-pica-part="option"]');
    options.forEach((option, index) => option.setAttribute("aria-selected", index === active ? "true" : "false"));
    const selected = options.item(active);
    if (selected) {
      input.setAttribute("aria-activedescendant", selected.id);
      selected.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function renderList(): void {
    list.replaceChildren();
    if (visible.length === 0) {
      const empty = commandPaletteNode("div", "empty");
      empty.textContent = props.emptyText;
      list.append(empty);
      setActive(-1);
      return;
    }
    visible.forEach((command, index) => {
      const option = commandPaletteNode("div", "option");
      const commandLabel = commandPaletteNode("span", "command-label");
      option.id = `${listId}-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", index === active ? "true" : "false");
      option.dataset.index = String(index);
      commandLabel.textContent = command.label;
      option.append(commandLabel);
      if (command.hint) {
        const hint = commandPaletteNode("span", "hint");
        hint.textContent = command.hint;
        option.append(hint);
      }
      list.append(option);
    });
    if (active >= visible.length) active = -1;
    setActive(active);
  }

  function filterCommands(): void {
    const query = input.value.trim().toLocaleLowerCase();
    visible = query
      ? props.commands.filter((command) => `${command.label} ${command.keywords ?? ""}`.toLocaleLowerCase().includes(query))
      : props.commands;
    active = -1;
    renderList();
  }

  function resetFilter(): void {
    input.value = "";
    visible = props.commands;
    active = -1;
    renderList();
  }

  function syncOpen(): void {
    const open = isOpen();
    input.setAttribute("aria-expanded", String(open));
    if (open && !dialog.open) {
      resetFilter();
      dialog.showModal();
      input.focus();
    } else if (!open && dialog.open) {
      resetFilter();
      dialog.close();
    }
  }

  function requestOpen(next: boolean): void {
    emit("openChange", next);
    if (props.open === null) {
      uncontrolledOpen = next;
      syncOpen();
    }
  }

  function runActive(): void {
    const command = visible[active];
    if (!command) return;
    emit("command", command.id);
    requestOpen(false);
  }

  const onInput = (): void => filterCommands();
  const onKeyDown = (event: KeyboardEvent): void => {
    if (visible.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((active + 1) % visible.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(active < 0 ? visible.length - 1 : (active - 1 + visible.length) % visible.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(visible.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runActive();
    }
  };
  const optionFromEvent = (event: Event): HTMLElement | null => {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    const option = target.closest<HTMLElement>('[data-pica-part="option"]');
    return option?.parentElement === list ? option : null;
  };
  const onPointerMove = (event: PointerEvent): void => {
    const option = optionFromEvent(event);
    if (option) setActive(Number(option.dataset.index));
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (optionFromEvent(event)) event.preventDefault();
  };
  const onListClick = (event: MouseEvent): void => {
    const option = optionFromEvent(event);
    if (!option) return;
    setActive(Number(option.dataset.index));
    runActive();
  };
  const onCancel = (event: Event): void => {
    event.preventDefault();
    requestOpen(false);
  };
  const onBackdropClick = (event: MouseEvent): void => {
    if (!props.dismissOnBackdrop || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      requestOpen(false);
    }
  };

  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  list.addEventListener("pointermove", onPointerMove);
  list.addEventListener("pointerdown", onPointerDown);
  list.addEventListener("click", onListClick);
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onBackdropClick);

  function apply(): void {
    attrs.set("aria-label", props.label);
    attrs.set("aria-modal", "true");
    input.setAttribute("aria-label", props.label);
    input.placeholder = props.placeholder;
    list.setAttribute("aria-label", props.label);
    sheet.setRules(commandPaletteRules(sheet.selector, props.width));
    renderList();
    syncOpen();
  }

  attrs.set("open", host.getAttribute("open"));
  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const before = props;
      props = { ...props, ...next };
      if (before.open !== null && props.open === null) uncontrolledOpen = dialog.open;
      if (!sameJson(before.commands, props.commands)) resetFilter();
      apply();
    },
    destroy() {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      list.removeEventListener("pointermove", onPointerMove);
      list.removeEventListener("pointerdown", onPointerDown);
      list.removeEventListener("click", onListClick);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onBackdropClick);
      if (dialog.open) dialog.close();
      frame.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
