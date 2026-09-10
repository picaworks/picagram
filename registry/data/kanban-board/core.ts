import { hiddenText } from "../../../lib/a11y";
import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

/** One card on the board. */
export interface KanbanCard {
  /** Identifies the card in the move event, stable across renders. */
  id: string;
  /** The card's short label. */
  title: string;
  /** A short mono tag shown under the title, such as "ui" or "data". */
  tag: string;
}

/** One column of cards. */
export interface KanbanColumn {
  /** Identifies the column as from and to in the move event. */
  id: string;
  /** The column's heading. */
  title: string;
  /** The cards in the column, top to bottom. */
  cards: KanbanCard[];
}

export interface KanbanBoardProps {
  /** The columns to show. Null means uncontrolled, so the board manages its own state from defaultValue. */
  value: KanbanColumn[] | null;
  /** The columns the board starts from when value is null. Read once, at mount. */
  defaultValue: KanbanColumn[];
  /** The accessible name of the board. */
  label: string;
  /** The font stack for every title, count, and tag. */
  fontFamily: string;
}

export interface KanbanBoardEvents {
  /** A card was dropped in a new column or position. */
  move: { card: string; from: string; to: string; index: number };
  /** The columns after a card moved. */
  valueChange: KanbanColumn[];
}

export const defaults: KanbanBoardProps = {
  value: null,
  defaultValue: [
    {
      id: "backlog",
      title: "Backlog",
      cards: [
        { id: "c1", title: "Measure glyph ramp", tag: "ascii" },
        { id: "c2", title: "Wire palette tokens", tag: "data" },
        { id: "c3", title: "Draft focus ring", tag: "ui" },
      ],
    },
    {
      id: "doing",
      title: "Doing",
      cards: [
        { id: "c4", title: "Spec mesh gradient", tag: "shaders" },
        { id: "c5", title: "Scope pointer drag", tag: "ui" },
      ],
    },
    {
      id: "done",
      title: "Done",
      cards: [{ id: "c6", title: "Ship scanlines", tag: "effects" }],
    },
  ],
  label: "Board",
  fontFamily: GRID_FONT,
};

/** A card's place among the columns. */
interface Spot {
  columnIndex: number;
  cardIndex: number;
}

/** A focus target: a real card, or the empty placeholder of a column that holds none. */
interface Stop {
  columnIndex: number;
  cardId: string | null;
}

/** A card being moved, and where it started. */
interface Grabbed {
  cardId: string;
  fromColumnId: string;
  fromIndex: number;
  fromCount: number;
}

function cloneCard(card: KanbanCard): KanbanCard {
  return { id: card.id, title: card.title, tag: card.tag };
}

function cloneColumns(cols: KanbanColumn[]): KanbanColumn[] {
  return cols.map((column) => ({ id: column.id, title: column.title, cards: column.cards.map(cloneCard) }));
}

/** The column and index of a card, by id. */
function locateCard(cols: KanbanColumn[], cardId: string): Spot | null {
  for (let columnIndex = 0; columnIndex < cols.length; columnIndex++) {
    const column = cols[columnIndex];
    if (!column) continue;
    const cardIndex = column.cards.findIndex((card) => card.id === cardId);
    if (cardIndex !== -1) return { columnIndex, cardIndex };
  }
  return null;
}

/** The current place of a focus target, or null when it no longer exists. */
function locateStop(cols: KanbanColumn[], stop: Stop): Spot | null {
  if (stop.cardId === null) {
    const column = cols[stop.columnIndex];
    return column && column.cards.length === 0 ? { columnIndex: stop.columnIndex, cardIndex: -1 } : null;
  }
  return locateCard(cols, stop.cardId);
}

/** The first stop on the board: the first column's first card, or its empty placeholder. */
function firstStop(cols: KanbanColumn[]): Stop | null {
  const column = cols[0];
  if (!column) return null;
  const card = column.cards[0];
  return { columnIndex: 0, cardId: card ? card.id : null };
}

/** Two stops are the same card wherever it now sits, since a card id is unique across the board. Only the
 *  empty placeholder, which has no id, needs its column index to tell columns apart. */
function stopEquals(a: Stop | null, b: Stop | null): boolean {
  if (!a || !b) return a === b;
  if (a.cardId !== null || b.cardId !== null) return a.cardId === b.cardId;
  return a.columnIndex === b.columnIndex;
}

/** Where an arrow key sends focus when nothing is grabbed. Up and down move within a column; left and right
 *  cross into the adjacent column, landing on its first stop. Both clamp at the board's edges. */
function navigate(cols: KanbanColumn[], stop: Stop, key: string): Stop {
  const spot = locateStop(cols, stop);
  if (!spot) return stop;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const column = cols[spot.columnIndex];
    if (!column || column.cards.length === 0) return stop;
    const card = column.cards[spot.cardIndex + (key === "ArrowUp" ? -1 : 1)];
    return card ? { columnIndex: spot.columnIndex, cardId: card.id } : stop;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const columnIndex = spot.columnIndex + (key === "ArrowLeft" ? -1 : 1);
    const column = cols[columnIndex];
    if (!column) return stop;
    const card = column.cards[0];
    return { columnIndex, cardId: card ? card.id : null };
  }
  return stop;
}

/** Moves the grabbed card one step by arrow key, mutating cols. Up and down reorder within its column; left
 *  and right send it to the front of the adjacent column. Returns whether it moved. */
function dragMove(cols: KanbanColumn[], cardId: string, key: string): boolean {
  const spot = locateCard(cols, cardId);
  const column = spot ? cols[spot.columnIndex] : undefined;
  if (!spot || !column) return false;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const target = spot.cardIndex + (key === "ArrowUp" ? -1 : 1);
    const card = column.cards[spot.cardIndex];
    if (target < 0 || target >= column.cards.length || !card) return false;
    column.cards.splice(spot.cardIndex, 1);
    column.cards.splice(target, 0, card);
    return true;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const target = cols[spot.columnIndex + (key === "ArrowLeft" ? -1 : 1)];
    const card = column.cards[spot.cardIndex];
    if (!target || !card) return false;
    column.cards.splice(spot.cardIndex, 1);
    target.cards.unshift(card);
    return true;
  }
  return false;
}

/** Moves the grabbed card to an arbitrary column and index, mutating cols, for pointer drags. Returns
 *  whether it moved. */
function relocateTo(cols: KanbanColumn[], cardId: string, columnIndex: number, index: number): boolean {
  const spot = locateCard(cols, cardId);
  const from = spot ? cols[spot.columnIndex] : undefined;
  const to = cols[columnIndex];
  const card = spot && from ? from.cards[spot.cardIndex] : undefined;
  if (!spot || !from || !to || !card) return false;
  const sameColumn = spot.columnIndex === columnIndex;
  if (sameColumn && index === spot.cardIndex) return false;
  from.cards.splice(spot.cardIndex, 1);
  const at = Math.max(0, Math.min(to.cards.length, sameColumn && index > spot.cardIndex ? index - 1 : index));
  to.cards.splice(at, 0, card);
  return true;
}

/** The column and index under a point: the nearest card by vertical middle, or the end of the column when
 *  the point is over empty space. Null when the point is outside every column. */
function hitTest(host: HTMLElement, x: number, y: number): { columnIndex: number; index: number } | null {
  const hit = document.elementFromPoint(x, y);
  const columnEl = hit instanceof HTMLElement ? hit.closest("[data-column-index]") : null;
  if (!(columnEl instanceof HTMLElement) || !host.contains(columnEl)) return null;
  const columnIndex = Number(columnEl.dataset.columnIndex);
  const cardEl = hit instanceof HTMLElement ? hit.closest('[data-pica="card"]') : null;
  if (cardEl instanceof HTMLElement && host.contains(cardEl) && Number(cardEl.dataset.columnIndex) === columnIndex) {
    const cardIndex = Number(cardEl.dataset.cardIndex);
    const rect = cardEl.getBoundingClientRect();
    return { columnIndex, index: y < rect.top + rect.height / 2 ? cardIndex : cardIndex + 1 };
  }
  return { columnIndex, index: Number.POSITIVE_INFINITY };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Readonly<Record<string, string>>): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

/** The scoped rules for one board. Secondary text and hairlines mix fg toward transparent rather than
 *  reading the muted token, so the default look draws with only fg and accent. */
function rules(s: string, fontFamily: string): string {
  const fg = cssVar("fg");
  const accent = cssVar("accent");
  const dim = (pct: number): string => `color-mix(in srgb, ${fg} ${pct}%, transparent)`;
  return [
    `${s}{font-family:${fontFamily};}`,
    `${s} [data-pica="columns"]{display:flex;gap:1em;align-items:flex-start;overflow-x:auto;}`,
    `${s} [data-pica="column"]{flex:0 0 auto;width:16em;box-sizing:border-box;border:1px solid ${dim(35)};}`,
    `${s} [data-pica="column-head"]{display:flex;justify-content:space-between;align-items:baseline;gap:0.5em;padding:0.6em 0.7em;text-transform:uppercase;letter-spacing:0.04em;font-size:0.85em;color:${fg};}`,
    `${s} [data-pica="column-count"]{color:${accent};font-variant-numeric:tabular-nums;}`,
    `${s} [data-pica="sr-only"]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}`,
    `${s} [data-pica="list"]{display:flex;flex-direction:column;gap:0.6em;padding:0 0.7em 0.7em;min-height:2.6em;}`,
    `${s} [data-pica="card"],${s} [data-pica="placeholder"]{box-sizing:border-box;border:1px solid ${dim(35)};padding:0.5em 0.6em;color:${fg};}`,
    `${s} [data-pica="card"]{cursor:pointer;touch-action:none;}`,
    `${s} [data-pica="placeholder"]{color:${dim(65)};text-align:center;font-size:0.85em;}`,
    `${s} [data-pica="card-title"]{display:block;}`,
    `${s} [data-pica="card-tag"]{display:block;margin-top:0.35em;font-size:0.8em;text-transform:uppercase;letter-spacing:0.04em;color:${dim(65)};}`,
    `${s} [data-pica="card"]:hover{background:${dim(10)};}`,
    `${s} [data-pica="card"]:focus-visible,${s} [data-pica="placeholder"]:focus-visible{outline:2px solid ${accent};outline-offset:2px;}`,
    `${s} [data-pica="card"][data-grabbed="true"]{border-color:${accent};border-width:2px;padding:calc(0.5em - 1px) calc(0.6em - 1px);}`,
  ].join("\n");
}

export const mount: Mount<KanbanBoardProps> = (host, initial = {}) => {
  let props: KanbanBoardProps = { ...defaults, ...initial };
  const emit = emitter<KanbanBoardEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);
  const uid = nextId("kanban");
  let destroyed = false;

  let columns: KanbanColumn[] = cloneColumns(props.defaultValue);
  let grabbed: Grabbed | null = null;
  let working: KanbanColumn[] | null = null;
  let focusedStop: Stop | null = firstStop(props.value ?? columns);

  const live = hiddenText("");
  live.setAttribute("data-pica", "live");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  const board = el("div", { "data-pica": "columns" });
  host.append(live, board);

  const announce = (text: string): void => {
    live.textContent = text;
  };
  const committedColumns = (): KanbanColumn[] => props.value ?? columns;

  function findStopElement(stop: Stop): HTMLElement | null {
    const nodes = board.querySelectorAll('[data-pica="card"],[data-pica="placeholder"]');
    for (const node of nodes) {
      const candidate = node as HTMLElement;
      const at: Stop = { columnIndex: Number(candidate.dataset.columnIndex), cardId: candidate.dataset.cardId ?? null };
      if (stopEquals(at, stop)) return candidate;
    }
    return null;
  }

  function buildCard(card: KanbanCard, column: KanbanColumn, columnIndex: number, cardIndex: number): HTMLElement {
    const isGrabbed = grabbed?.cardId === card.id;
    const node = el("div", {
      "data-pica": "card",
      role: "option",
      "aria-selected": isGrabbed ? "true" : "false",
      "aria-label": `${card.title}, ${cardIndex + 1} of ${column.cards.length}`,
      tabindex: stopEquals(focusedStop, { columnIndex, cardId: card.id }) ? "0" : "-1",
      "data-card-id": card.id,
      "data-column-index": String(columnIndex),
      "data-card-index": String(cardIndex),
    });
    if (isGrabbed) node.setAttribute("data-grabbed", "true");
    const title = el("span", { "data-pica": "card-title" });
    title.textContent = card.title;
    const tag = el("span", { "data-pica": "card-tag" });
    tag.textContent = card.tag;
    node.append(title, tag);
    return node;
  }

  function buildPlaceholder(column: KanbanColumn, columnIndex: number): HTMLElement {
    const node = el("div", {
      "data-pica": "placeholder",
      role: "option",
      "aria-selected": "false",
      "aria-label": `${column.title} is empty`,
      tabindex: stopEquals(focusedStop, { columnIndex, cardId: null }) ? "0" : "-1",
      "data-column-index": String(columnIndex),
      "data-card-index": "0",
    });
    node.textContent = "No cards";
    return node;
  }

  function buildColumn(column: KanbanColumn, columnIndex: number): HTMLElement {
    const headId = `${uid}-head-${columnIndex}`;
    const head = el("div", { "data-pica": "column-head", id: headId });
    const title = el("span", { "data-pica": "column-title" });
    title.textContent = column.title;
    const count = el("span", { "data-pica": "column-count" });
    count.textContent = String(column.cards.length);
    const countWord = el("span", { "data-pica": "sr-only" });
    countWord.textContent = column.cards.length === 1 ? " card" : " cards";
    count.append(countWord);
    head.append(title, " ", count);
    const list = el("div", { "data-pica": "list", role: "listbox", "aria-labelledby": headId, "data-column-index": String(columnIndex) });
    if (column.cards.length === 0) list.append(buildPlaceholder(column, columnIndex));
    else column.cards.forEach((card, cardIndex) => list.append(buildCard(card, column, columnIndex, cardIndex)));
    const wrap = el("div", { "data-pica": "column", "data-column-index": String(columnIndex) });
    wrap.append(head, list);
    return wrap;
  }

  function apply(): void {
    attrs.set("role", "group");
    attrs.set("aria-label", props.label ? props.label : null);
    sheet.setRules(rules(sheet.selector, props.fontFamily));
    const display = grabbed && working ? working : committedColumns();
    const hadFocus = host.contains(document.activeElement);
    board.replaceChildren(...display.map((column, index) => buildColumn(column, index)));
    if (hadFocus && focusedStop) findStopElement(focusedStop)?.focus({ preventScroll: true });
  }

  function pickUp(cardId: string): void {
    const committed = committedColumns();
    const spot = locateCard(committed, cardId);
    const column = spot ? committed[spot.columnIndex] : undefined;
    const card = spot && column ? column.cards[spot.cardIndex] : undefined;
    if (!spot || !column || !card) return;
    grabbed = { cardId, fromColumnId: column.id, fromIndex: spot.cardIndex, fromCount: column.cards.length };
    working = cloneColumns(committed);
    focusedStop = { columnIndex: spot.columnIndex, cardId };
    announce(`Picked up ${card.title}, ${spot.cardIndex + 1} of ${column.cards.length} in ${column.title}. Arrow keys move it, space drops it, escape cancels.`);
    apply();
  }

  function dropGrabbed(): void {
    const active = grabbed;
    const draft = working;
    if (!active || !draft) return;
    const spot = locateCard(draft, active.cardId);
    const column = spot ? draft[spot.columnIndex] : undefined;
    const card = spot && column ? column.cards[spot.cardIndex] : undefined;
    if (spot && column && card) {
      if (column.id !== active.fromColumnId || spot.cardIndex !== active.fromIndex) {
        const snapshot = cloneColumns(draft);
        emit("move", { card: card.id, from: active.fromColumnId, to: column.id, index: spot.cardIndex });
        emit("valueChange", snapshot);
        if (props.value === null) columns = cloneColumns(draft);
        announce(`Dropped ${card.title} in ${column.title}, ${spot.cardIndex + 1} of ${column.cards.length}.`);
      } else {
        announce(`Dropped ${card.title}.`);
      }
    }
    grabbed = null;
    working = null;
    apply();
  }

  function cancelGrab(): void {
    const active = grabbed;
    if (!active) return;
    const committed = committedColumns();
    const spot = locateCard(committed, active.cardId);
    const column = spot ? committed[spot.columnIndex] : undefined;
    const card = spot && column ? column.cards[spot.cardIndex] : undefined;
    announce(card && column ? `Cancelled. ${card.title} stayed in ${column.title}, ${active.fromIndex + 1} of ${active.fromCount}.` : "Cancelled.");
    grabbed = null;
    working = null;
    apply();
  }

  function onKeydown(event: KeyboardEvent): void {
    const target = event.target;
    const stopEl = target instanceof HTMLElement ? target.closest('[data-pica="card"],[data-pica="placeholder"]') : null;
    if (!(stopEl instanceof HTMLElement) || !host.contains(stopEl)) return;
    if (event.key === " ") {
      event.preventDefault();
      if (grabbed) dropGrabbed();
      else if (stopEl.dataset.cardId) pickUp(stopEl.dataset.cardId);
      return;
    }
    if (event.key === "Escape") {
      if (grabbed) {
        event.preventDefault();
        cancelGrab();
      }
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const active = grabbed;
      const draft = working;
      if (active && draft) {
        if (!dragMove(draft, active.cardId, event.key)) return;
        const spot = locateCard(draft, active.cardId);
        const column = spot ? draft[spot.columnIndex] : undefined;
        const card = spot && column ? column.cards[spot.cardIndex] : undefined;
        if (spot && column && card) {
          focusedStop = { columnIndex: spot.columnIndex, cardId: active.cardId };
          announce(`${card.title} now ${spot.cardIndex + 1} of ${column.cards.length} in ${column.title}.`);
        }
        apply();
      } else if (focusedStop) {
        const next = navigate(committedColumns(), focusedStop, event.key);
        if (!stopEquals(next, focusedStop)) {
          focusedStop = next;
          apply();
        }
      }
    }
  }

  let pointerId: number | null = null;
  let pointerCardId: string | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let dragging = false;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const target = event.target;
    const cardEl = target instanceof HTMLElement ? target.closest('[data-pica="card"]') : null;
    if (!(cardEl instanceof HTMLElement) || !host.contains(cardEl) || !cardEl.dataset.cardId) return;
    if (grabbed && grabbed.cardId !== cardEl.dataset.cardId) cancelGrab();
    pointerId = event.pointerId;
    pointerCardId = cardEl.dataset.cardId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    dragging = false;
    host.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    const activeId = pointerId;
    const cardId = pointerCardId;
    if (activeId === null || event.pointerId !== activeId || !cardId) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) < 5) return;
      dragging = true;
      if (!grabbed) pickUp(cardId);
    }
    event.preventDefault();
    const draft = working;
    if (!grabbed || !draft) return;
    const hit = hitTest(host, event.clientX, event.clientY);
    if (hit && relocateTo(draft, cardId, hit.columnIndex, hit.index)) {
      const spot = locateCard(draft, cardId);
      if (spot) focusedStop = { columnIndex: spot.columnIndex, cardId };
      apply();
    }
  }

  function endPointer(event: PointerEvent, cancel: boolean): void {
    const activeId = pointerId;
    if (activeId === null || event.pointerId !== activeId) return;
    if (host.hasPointerCapture(activeId)) host.releasePointerCapture(activeId);
    pointerId = null;
    pointerCardId = null;
    const wasDragging = dragging;
    dragging = false;
    if (wasDragging) {
      if (cancel) cancelGrab();
      else dropGrabbed();
    }
  }

  const onPointerUp = (event: PointerEvent): void => endPointer(event, false);
  const onPointerCancel = (event: PointerEvent): void => endPointer(event, true);

  function onFocusIn(event: FocusEvent): void {
    const target = event.target;
    const stopEl = target instanceof HTMLElement ? target.closest('[data-pica="card"],[data-pica="placeholder"]') : null;
    if (!(stopEl instanceof HTMLElement) || !host.contains(stopEl)) return;
    const next: Stop = { columnIndex: Number(stopEl.dataset.columnIndex), cardId: stopEl.dataset.cardId ?? null };
    if (stopEquals(next, focusedStop)) return;
    focusedStop = next;
    for (const node of board.querySelectorAll('[data-pica="card"],[data-pica="placeholder"]')) (node as HTMLElement).tabIndex = node === stopEl ? 0 : -1;
  }

  host.addEventListener("keydown", onKeydown);
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerUp);
  host.addEventListener("pointercancel", onPointerCancel);
  host.addEventListener("focusin", onFocusIn);

  apply();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const prevValue = props.value;
      props = { ...props, ...next };
      if (!sameJson(prevValue, props.value)) {
        grabbed = null;
        working = null;
        const committed = committedColumns();
        if (!focusedStop || !locateStop(committed, focusedStop)) focusedStop = firstStop(committed);
      }
      apply();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      host.removeEventListener("keydown", onKeydown);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerCancel);
      host.removeEventListener("focusin", onFocusIn);
      live.remove();
      board.remove();
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
