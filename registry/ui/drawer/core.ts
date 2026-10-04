import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface DrawerProps {
  /** The controlled open state. Null lets the drawer manage its own state. */
  open: boolean | null;
  /** The initial open state when open is null. It is read only when the drawer mounts. */
  defaultOpen: boolean;
  /** The viewport edge that holds the drawer. */
  edge: "left" | "right" | "bottom";
  /** The panel width or height in rem, depending on its edge. */
  size: number;
  /** The visible heading that labels the dialog. */
  title: string;
  /** Shows a button that requests the drawer to close. */
  closable: boolean;
  /** Lets a click outside the panel request the drawer to close. */
  dismissOnBackdrop: boolean;
}

export interface DrawerEvents {
  /** The user requested a change to the open state. */
  openChange: boolean;
}

export const defaults: DrawerProps = {
  open: null,
  defaultOpen: false,
  edge: "right",
  size: 22,
  title: "Build settings",
  closable: true,
  dismissOnBackdrop: true,
};

const DRAWER_PADDING = "1.25rem";

/** Scoped rules for the panel, its native backdrop, and the header it owns. */
function drawerRules(selector: string, props: DrawerProps): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const accent = cssVar("accent");
  const size = Math.min(40, Math.max(16, Number.isFinite(props.size) ? props.size : defaults.size));
  const placement: Readonly<Record<DrawerProps["edge"], readonly string[]>> = {
    left: [
      "inset:0 auto 0 0",
      `width:min(${size}rem, 100vw)!important`,
      "height:100dvh!important",
      `border-right:1px solid ${fg}`,
    ],
    right: [
      "inset:0 0 0 auto",
      `width:min(${size}rem, 100vw)!important`,
      "height:100dvh!important",
      `border-left:1px solid ${fg}`,
    ],
    bottom: [
      "inset:auto 0 0 0",
      "width:100vw!important",
      `height:min(${size}rem, 100dvh)!important`,
      `border-top:1px solid ${fg}`,
    ],
  };
  const base = [
    "position:fixed",
    "box-sizing:border-box",
    "max-width:none",
    "max-height:none",
    "min-width:0",
    "margin:0",
    `padding:${DRAWER_PADDING}`,
    "border:0",
    "border-radius:0",
    "overflow:auto",
    "overscroll-behavior:contain",
    `background:linear-gradient(${bg},${bg}),Canvas`,
    `color:${fg}`,
    "font:inherit",
    "line-height:1.6",
    ...placement[props.edge],
  ];
  return [
    `${selector}{${base.join(";")}}`,
    `${selector}::backdrop{background:color-mix(in srgb, ${fg} 14%, transparent)}`,
    `${selector}>[data-pica-drawer-header]{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:-${DRAWER_PADDING} -${DRAWER_PADDING} ${DRAWER_PADDING};padding:0.9rem ${DRAWER_PADDING};border-bottom:1px solid ${fg}}`,
    `${selector}>[data-pica-drawer-header]>h2{margin:0;font:inherit;font-weight:600;line-height:1.3}`,
    `${selector}>[data-pica-drawer-header]>button{appearance:none;margin:0;padding:0.2em 0.45em;border:1px solid ${fg};border-radius:0;background:transparent;color:${fg};font-family:${GRID_FONT};font-size:1em;line-height:1;cursor:pointer}`,
    `${selector}>[data-pica-drawer-header]>button:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector}>[data-pica-drawer-header]>button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`,
  ].join("\n");
}

export const mount: Mount<DrawerProps> = (host, initial = {}) => {
  const dialog = host as HTMLDialogElement;
  let props: DrawerProps = { ...defaults, ...initial };
  let localOpen = props.open ?? props.defaultOpen;
  const emit = emitter<DrawerEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const headingId = nextId("pica-drawer-title");
  const header = document.createElement("header");
  const heading = document.createElement("h2");
  const closeButton = document.createElement("button");

  header.setAttribute("data-pica", "");
  header.setAttribute("data-pica-drawer-header", "");
  heading.setAttribute("data-pica", "");
  heading.id = headingId;
  closeButton.setAttribute("data-pica", "");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close drawer");
  closeButton.textContent = "×";
  header.append(heading, closeButton);
  host.prepend(header);

  attrs.set("open", dialog.getAttribute("open"));
  attrs.set("aria-labelledby", headingId);
  attrs.set("aria-modal", "true");
  if (dialog.open) dialog.close();

  function shown(): boolean {
    return props.open ?? localOpen;
  }

  function syncOpen(): void {
    if (shown()) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  function requestClose(): void {
    emit("openChange", false);
    if (props.open === null) {
      localOpen = false;
      syncOpen();
    }
  }

  const onCloseClick = (): void => requestClose();
  const onCancel = (event: Event): void => {
    event.preventDefault();
    requestClose();
  };
  const onBackdropClick = (event: MouseEvent): void => {
    if (!props.dismissOnBackdrop || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) requestClose();
  };

  closeButton.addEventListener("click", onCloseClick);
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onBackdropClick);

  function apply(): void {
    heading.textContent = props.title;
    sheet.setRules(drawerRules(sheet.selector, props));
    if (props.closable && !closeButton.isConnected) header.append(closeButton);
    if (!props.closable) closeButton.remove();
    syncOpen();
  }

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      props = { ...props, ...next };
      apply();
    },
    destroy() {
      closeButton.removeEventListener("click", onCloseClick);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onBackdropClick);
      if (dialog.open) dialog.close();
      header.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
