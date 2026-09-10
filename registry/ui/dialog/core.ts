import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope, styleHost } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DialogProps {
  /** Whether the dialog is open. Null leaves it uncontrolled, so the dialog opens and closes itself. */
  open: boolean | null;
  /** The initial open state when open is left uncontrolled. Read once, at mount. */
  defaultOpen: boolean;
  /** The heading shown at the top of the dialog, read by assistive technology through aria-labelledby. */
  title: string;
  /** Shows a close button in the corner with an accessible name. */
  closable: boolean;
  /** Closes the dialog on a click outside its content, on the backdrop. */
  dismissOnBackdrop: boolean;
  /** The dialog's width, in rem. */
  width: number;
}

export interface DialogEvents {
  /** The open state requested by Escape, the close button, or a backdrop click. */
  openChange: boolean;
}

export const defaults: DialogProps = {
  open: null,
  defaultOpen: false,
  title: "Deploy to production",
  closable: true,
  dismissOnBackdrop: true,
  width: 32,
};

/** The close glyph, a single mono character rather than a drawn icon. */
const CLOSE_GLYPH = "×";

/** The scoped rules for one dialog: a hairline frame, square corners, no shadow, and a backdrop tinted with
 *  fg. The close button is the only descendant styled here, selected by its own data-pica marker so a
 *  button inside the dialog's own children is never touched. Width and height are set through styleHost
 *  instead, an inline style, because a demo page may style a host element by id at higher specificity. */
function rules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  return [
    `${s}{box-sizing:border-box;background:${bg};color:${fg};border:1px solid ${fg};border-radius:0;box-shadow:none;padding:1.5rem;max-width:calc(100vw - 2rem);max-height:calc(100vh - 2rem);overflow:auto}`,
    `${s}::backdrop{background:color-mix(in srgb, ${fg} 35%, transparent)}`,
    `${s} button[data-pica]{appearance:none;margin:0;background:transparent;border:1px solid transparent;color:${fg};font-family:${GRID_FONT};font-size:1.1em;line-height:1;padding:0.15em 0.5em;cursor:pointer}`,
    `${s} button[data-pica]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${s} button[data-pica]:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<DialogProps> = (host, initial = {}) => {
  let props: DialogProps = { ...defaults, ...initial };
  // showModal, close, and open are specific to HTMLDialogElement; meta.host guarantees the host is one.
  const dialog = host as HTMLDialogElement;
  const emit = emitter<DialogEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  // The open state while `open` is left null. Seeded once from defaultOpen, then owned by user input.
  let openState = props.defaultOpen;
  // Set on the first apply, by styleHost, so its restore function undoes exactly what mount found. Later
  // width changes go straight through host.style, which that same restore still unwinds correctly.
  let restoreSize: (() => void) | null = null;

  const titleId = nextId("pica-dialog-title");
  const header = document.createElement("div");
  header.setAttribute("data-pica", "");
  header.style.cssText = `display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid ${cssVar("fg")};padding-bottom:0.75rem;margin-bottom:1rem`;

  const heading = document.createElement("h2");
  heading.setAttribute("data-pica", "");
  heading.id = titleId;
  heading.style.cssText = "margin:0;font-size:1.125em;font-weight:600";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("data-pica", "");
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = CLOSE_GLYPH;

  header.append(heading, closeButton);
  host.prepend(header);

  /** Applies a close requested by the user. Uncontrolled, the dialog closes itself; controlled, it only
   *  reports the request and waits for `open` to arrive through update(). Either way it always emits. */
  function requestClose(): void {
    if (props.open === null) {
      openState = false;
      apply();
    }
    emit("openChange", false);
  }

  const onCancel = (event: Event): void => {
    // The native default action would close the dialog itself; requestClose decides that instead, so an
    // uncontrolled and a controlled dialog behave the same way on Escape.
    event.preventDefault();
    requestClose();
  };
  const onCloseClick = (): void => {
    requestClose();
  };
  const onBackdropClick = (event: MouseEvent): void => {
    if (!props.dismissOnBackdrop || !dialog.open) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) requestClose();
  };

  host.addEventListener("cancel", onCancel);
  host.addEventListener("click", onBackdropClick);
  closeButton.addEventListener("click", onCloseClick);

  function apply(): void {
    heading.textContent = props.title;
    attrs.set("aria-labelledby", titleId);
    attrs.set("aria-modal", "true");
    if (props.closable && !closeButton.isConnected) header.append(closeButton);
    if (!props.closable && closeButton.isConnected) closeButton.remove();
    const width = `${props.width}rem`;
    if (restoreSize) host.style.setProperty("width", width);
    else restoreSize = styleHost(host, { width, height: "fit-content" });
    sheet.setRules(rules(sheet.selector));
    const desired = props.open ?? openState;
    if (desired && !dialog.open) dialog.showModal();
    if (!desired && dialog.open) dialog.close();
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      // Leaves the dialog exactly as mount found it: closed, with none of its own attributes or children.
      if (dialog.open) dialog.close();
      host.removeEventListener("cancel", onCancel);
      host.removeEventListener("click", onBackdropClick);
      closeButton.removeEventListener("click", onCloseClick);
      header.remove();
      sheet.destroy();
      attrs.restore();
      restoreSize?.();
      delete host.dataset.picaReady;
    },
  };
};
