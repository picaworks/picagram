import { emitter } from "../../../lib/events";
import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface TreeNode {
  /** The stable value reported when this node is selected. */
  id: string;
  /** The text shown for this node. */
  label: string;
  /** Child nodes nested beneath this node. */
  children?: readonly TreeNode[];
}

export interface TreeViewProps {
  /** The hierarchical nodes shown in the tree. */
  nodes: readonly TreeNode[];
  /** The selected node id, or null to manage selection inside the core. */
  value: string | null;
  /** The initially selected node id when value is null. */
  defaultValue: string;
  /** Parent ids that start open. */
  expanded: readonly string[];
  /** The accessible name of the tree. */
  label: string;
}

export interface TreeViewEvents {
  /** A node was selected through the keyboard or pointer. */
  valueChange: string;
}

export const defaults: TreeViewProps = {
  nodes: [
    {
      id: "components",
      label: "Components",
      children: [
        { id: "ascii", label: "ASCII" },
        { id: "dither", label: "Dither" },
        { id: "shaders", label: "Shaders" },
      ],
    },
    {
      id: "docs",
      label: "Docs",
      children: [
        { id: "guides", label: "Guides" },
        { id: "reference", label: "Reference" },
      ],
    },
  ],
  value: null,
  defaultValue: "dither",
  expanded: ["components"],
  label: "Contents",
};

interface TreeEntry {
  readonly node: TreeNode;
  readonly el: HTMLElement;
  readonly row: HTMLElement;
  readonly marker: HTMLElement;
  readonly label: HTMLElement;
  readonly group: HTMLElement | null;
  readonly parentId: string | null;
}

function treeRules(selector: string): string {
  const fg = cssVar("fg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return [
    `${selector}{display:flex;flex-direction:column;justify-content:center;min-height:12rem;color:${fg}}`,
    `${selector}>[role="treeitem"]{width:min(100%,22rem);margin-inline:auto}`,
    `${selector} [role="treeitem"]{list-style:none;outline:none;box-sizing:border-box}`,
    `${selector} [role="group"]{display:block}`,
    `${selector} [role="group"][hidden]{display:none}`,
    `${selector} [data-pica-row]{display:flex;align-items:baseline;min-height:2rem;padding:0.34rem 0.5rem;box-sizing:border-box;cursor:default}`,
    `${selector} [data-pica-row]:hover{background:color-mix(in srgb, ${fg} 10%, transparent)}`,
    `${selector} [role="treeitem"]:focus-visible>[data-pica-row]{outline:2px solid ${accent};outline-offset:2px}`,
    `${selector} [data-pica-guide]{flex:none;color:${muted};font-family:${GRID_FONT};white-space:pre}`,
    `${selector} [data-pica-marker]{flex:none;width:1.5ch;color:${muted};font-family:${GRID_FONT};font-weight:600;cursor:pointer}`,
    `${selector} [data-pica-marker="leaf"]{cursor:default}`,
    `${selector} [data-pica-label]{font:inherit;line-height:1.3;border-bottom:2px solid transparent}`,
    `${selector} [aria-selected="true"]>[data-pica-row]>[data-pica-label]{border-bottom-color:${accent}}`,
  ].join("\n");
}

export const mount: Mount<TreeViewProps> = (host, initial = {}) => {
  let props: TreeViewProps = { ...defaults, ...initial };
  let internalValue = props.defaultValue;
  let open = new Set(props.expanded);
  let focusId = props.nodes[0]?.id ?? "";
  let entries: TreeEntry[] = [];
  let roots: HTMLElement[] = [];
  let byId = new Map<string, TreeEntry>();
  const emit = emitter<TreeViewEvents>(host);
  const attrs = hostAttributes(host);
  const sheet = scope(host);

  const selected = (): string => props.value === null ? internalValue : props.value;

  function isVisible(entry: TreeEntry): boolean {
    let parentId = entry.parentId;
    while (parentId !== null) {
      if (!open.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return true;
  }

  function visibleEntries(): TreeEntry[] {
    return entries.filter(isVisible);
  }

  function applyRoving(): void {
    const visible = visibleEntries();
    if (!visible.some((entry) => entry.node.id === focusId)) focusId = visible[0]?.node.id ?? "";
    for (const entry of entries) entry.el.tabIndex = entry.node.id === focusId ? 0 : -1;
  }

  function applySelection(): void {
    const value = selected();
    for (const entry of entries) entry.el.setAttribute("aria-selected", String(entry.node.id === value));
  }

  function applyExpansion(): void {
    for (const entry of entries) {
      if (!entry.group) continue;
      const expanded = open.has(entry.node.id);
      entry.el.setAttribute("aria-expanded", String(expanded));
      entry.marker.textContent = expanded ? "-" : "+";
      entry.group.hidden = !expanded;
    }
    applyRoving();
  }

  function focusEntry(entry: TreeEntry): void {
    focusId = entry.node.id;
    applyRoving();
    entry.el.focus();
  }

  function buildLevel(nodes: readonly TreeNode[], parent: HTMLElement, parentId: string | null, depth: number, prefix: string): void {
    nodes.forEach((node, index) => {
      const last = index === nodes.length - 1;
      const item = document.createElement("div");
      const row = document.createElement("div");
      const guide = document.createElement("span");
      const marker = document.createElement("span");
      const label = document.createElement("span");
      const hasChildren = Boolean(node.children?.length);
      item.setAttribute("data-pica", "");
      item.setAttribute("data-node-id", node.id);
      item.setAttribute("role", "treeitem");
      item.setAttribute("aria-label", node.label);
      item.setAttribute("aria-level", String(depth + 1));
      item.setAttribute("aria-posinset", String(index + 1));
      item.setAttribute("aria-setsize", String(nodes.length));
      row.setAttribute("data-pica", "");
      row.setAttribute("data-pica-row", "");
      guide.setAttribute("data-pica", "");
      guide.setAttribute("data-pica-guide", "");
      guide.setAttribute("aria-hidden", "true");
      guide.textContent = depth === 0 ? "─" : `${prefix}${last ? "└" : "├"}`;
      marker.setAttribute("data-pica", "");
      marker.setAttribute("data-pica-marker", hasChildren ? "parent" : "leaf");
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = hasChildren ? "+" : "·";
      label.setAttribute("data-pica", "");
      label.setAttribute("data-pica-label", "");
      label.textContent = node.label;
      row.append(guide, marker, label);
      item.append(row);
      let group: HTMLElement | null = null;
      if (hasChildren) {
        group = document.createElement("div");
        group.setAttribute("data-pica", "");
        group.setAttribute("role", "group");
        item.append(group);
      }
      parent.append(item);
      const entry: TreeEntry = { node, el: item, row, marker, label, group, parentId };
      entries.push(entry);
      byId.set(node.id, entry);
      if (group && node.children) buildLevel(node.children, group, node.id, depth + 1, `${prefix}${last ? " " : "│"}`);
    });
  }

  function rebuild(): void {
    for (const root of roots) root.remove();
    entries = [];
    roots = [];
    byId = new Map();
    const holder = document.createElement("div");
    holder.setAttribute("data-pica", "");
    buildLevel(props.nodes, holder, null, 0, "");
    roots = Array.from(holder.children) as HTMLElement[];
    host.append(...roots);
    applySelection();
    applyExpansion();
  }

  function toggle(entry: TreeEntry): void {
    if (!entry.group) return;
    if (open.has(entry.node.id)) {
      if (entry.group.contains(document.activeElement)) focusEntry(entry);
      open.delete(entry.node.id);
    } else open.add(entry.node.id);
    applyExpansion();
  }

  function choose(entry: TreeEntry): void {
    if (props.value === null) {
      internalValue = entry.node.id;
      applySelection();
    }
    emit("valueChange", entry.node.id);
  }

  const itemFrom = (target: EventTarget | null): TreeEntry | undefined => {
    if (!(target instanceof Element)) return undefined;
    const item = target.closest<HTMLElement>("[role=treeitem]");
    return item ? byId.get(item.getAttribute("data-node-id") ?? "") : undefined;
  };

  const onClick = (event: MouseEvent): void => {
    const entry = itemFrom(event.target);
    if (!entry || !(event.target instanceof Element)) return;
    if (event.target.closest("[data-pica-marker=parent]")) {
      focusEntry(entry);
      toggle(entry);
    } else if (event.target.closest("[data-pica-label]")) {
      focusEntry(entry);
      choose(entry);
    }
  };

  const onFocusIn = (event: FocusEvent): void => {
    const entry = itemFrom(event.target);
    if (!entry) return;
    focusId = entry.node.id;
    applyRoving();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const entry = itemFrom(event.target);
    if (!entry) return;
    const visible = visibleEntries();
    const index = visible.indexOf(entry);
    let destination: TreeEntry | undefined;
    if (event.key === "ArrowRight") {
      if (entry.group) {
        if (!open.has(entry.node.id)) toggle(entry);
        else destination = visible[index + 1];
      }
    } else if (event.key === "ArrowLeft") {
      if (entry.group && open.has(entry.node.id)) toggle(entry);
      else if (entry.parentId) destination = byId.get(entry.parentId);
    } else if (event.key === "ArrowDown") destination = visible[index + 1];
    else if (event.key === "ArrowUp") destination = visible[index - 1];
    else if (event.key === "Home") destination = visible[0];
    else if (event.key === "End") destination = visible[visible.length - 1];
    else if (event.key === "Enter" || event.key === " ") choose(entry);
    else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const needle = event.key.toLocaleLowerCase();
      for (let offset = 1; offset <= visible.length; offset++) {
        const candidate = visible[(index + offset) % visible.length];
        if (candidate?.node.label.toLocaleLowerCase().startsWith(needle)) {
          destination = candidate;
          break;
        }
      }
    } else return;
    event.preventDefault();
    if (destination) focusEntry(destination);
  };

  attrs.set("role", "tree");
  attrs.set("aria-label", props.label);
  sheet.setRules(treeRules(sheet.selector));
  host.addEventListener("click", onClick);
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("keydown", onKeyDown);
  rebuild();
  host.dataset.picaReady = "true";

  return {
    update(next) {
      const nodesChanged = next.nodes !== undefined && !sameJson(next.nodes, props.nodes);
      const expandedChanged = next.expanded !== undefined && !sameJson(next.expanded, props.expanded);
      props = { ...props, ...next };
      if (expandedChanged) open = new Set(props.expanded);
      if (nodesChanged) rebuild();
      else {
        if (expandedChanged) applyExpansion();
        if (next.value !== undefined) applySelection();
      }
      if (next.label !== undefined) attrs.set("aria-label", props.label);
    },
    destroy() {
      host.removeEventListener("click", onClick);
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("keydown", onKeyDown);
      for (const root of roots) root.remove();
      roots = [];
      sheet.destroy();
      attrs.restore();
      delete host.dataset.picaReady;
    },
  };
};
