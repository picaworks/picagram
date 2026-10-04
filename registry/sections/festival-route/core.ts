import { GRID_FONT } from "../../../lib/font";
import { hostAttributes, nextId, scope } from "../../../lib/host";
import { sameJson } from "../../../lib/json";
import { cssVar } from "../../../lib/palette";
import type { Mount } from "../../../lib/types";

export interface FestivalVenue {
  /** The venue name. */
  name: string;
  /** The event at this stop. */
  event: string;
  /** The street address. */
  address: string;
  /** The event time. */
  time: string;
  /** Venue access information. */
  access: string;
}

export interface FestivalRouteProps {
  /** The arts walk title. */
  title: string;
  /** The neighbourhood name. */
  neighbourhood: string;
  /** The festival date. */
  date: string;
  /** The welcome statement. */
  introduction: string;
  /** The ordered stops on the route. */
  venues: readonly FestivalVenue[];
}

export const defaults: FestivalRouteProps = {
  title: "Take the long way.",
  neighbourhood: "Eastbank / Open Arts Walk",
  date: "SATURDAY 17 MAY / 11:00—18:00",
  introduction: "Follow the river, turn into a workshop, linger in a courtyard. Five places open their doors for a day of making, listening, and unexpected encounters.",
  venues: [
    { name: "The Print Room", event: "Make a two-colour edition", address: "8 Foundry Street", time: "11:00–13:00", access: "Step-free entrance; seated worktables." },
    { name: "Canal Yard", event: "Sound in the open air", address: "21 Canal Walk", time: "12:00–15:00", access: "Level outdoor route; accessible toilet." },
    { name: "Former Post Office", event: "Artists at work", address: "3 Bridge Road", time: "13:00–16:00", access: "Ramp entrance on Bridge Road." },
    { name: "Glasshouse", event: "Objects, stories, and tea", address: "16 Garden Lane", time: "14:00–17:00", access: "Wide doors; quiet room available." },
    { name: "River Steps", event: "A closing performance", address: "South Quay", time: "17:00–18:00", access: "Level viewing space above the steps." },
  ],
};

function routeNode<K extends keyof HTMLElementTagNameMap>(tag: K, part: string, text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.setAttribute("data-pica", "");
  if (part) el.setAttribute("data-pica-part", part);
  el.textContent = text;
  return el;
}

function routeSvg<K extends keyof SVGElementTagNameMap>(tag: K, values: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  el.setAttribute("data-pica", "");
  for (const [key, value] of Object.entries(values)) el.setAttribute(key, value);
  return el;
}

function routeLink(label: string, target: string): HTMLAnchorElement {
  const a = routeNode("a", "", label);
  a.href = `#${target}`;
  return a;
}

function routeRules(s: string): string {
  const fg = cssVar("fg");
  const bg = cssVar("bg");
  const muted = cssVar("muted");
  const accent = cssVar("accent");
  return `
${s}{box-sizing:border-box;color:${fg};background:${bg}}
${s} [data-pica-page]{max-width:1200px;margin:auto;padding:clamp(20px,4vw,54px);font-size:16px;line-height:1.55}
${s} [data-pica-page] *{box-sizing:border-box;min-width:0}
${s} h1,${s} h2,${s} h3,${s} p,${s} figure,${s} dl,${s} dd{margin:0}
${s} h1{font:inherit;font-size:clamp(42px,6vw,80px);line-height:.98;letter-spacing:-.055em;font-weight:500}
${s} h2{font:inherit;font-size:clamp(25px,3vw,38px);line-height:1.1;letter-spacing:-.035em;font-weight:500}
${s} h3{font:inherit;font-size:22px;line-height:1.2;letter-spacing:-.02em;font-weight:500}
${s} [data-pica-part="label"]{font-family:${GRID_FONT};font-size:11px;line-height:1.5;letter-spacing:.08em;text-transform:uppercase}
${s} [data-pica-part="muted"]{color:${muted}}
${s} [data-pica-part="top"]{display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:1px solid ${fg};padding-bottom:15px}
${s} nav{display:flex;gap:22px;flex-wrap:wrap}
${s} a{color:inherit;text-decoration-thickness:1px;text-underline-offset:4px;font-family:${GRID_FONT};font-size:11px;letter-spacing:.04em}
${s} a:focus-visible,${s} summary:focus-visible{outline:2px solid ${accent};outline-offset:4px}
${s} [data-pica-part="footer"]{display:flex;justify-content:space-between;gap:20px;margin-top:44px;border-top:1px solid ${fg};padding-top:18px;font-size:12px}
${s} svg{display:block;width:100%;height:auto;fill:none;stroke:currentColor;stroke-width:1.4}
${s} [data-pica-part="solid"]{fill:currentColor;stroke:none}
${s} [data-pica-part="accent"]{color:${accent}}
${s} [data-pica-part="rule"]{height:1px;background:${fg}}
@media(max-width:600px){${s} [data-pica-part="top"]{align-items:flex-start;flex-direction:column;gap:12px}${s} nav{gap:17px}${s} [data-pica-part="footer"]{flex-direction:column;gap:8px}${s} [data-pica-page]{font-size:15px}}

${s} [data-pica-part="opening"]{display:grid;grid-template-columns:1.1fr 1fr;gap:80px;padding:36px 0 42px}
${s} [data-pica-part="opening"] h1{font-family:var(--pica-font-wide,inherit);font-size:clamp(56px,7vw,88px);max-width:9ch;font-weight:600;line-height:.98}
${s} [data-pica-part="intro"]{display:grid;gap:22px;align-content:start}
${s} [data-pica-part="intro"] p{font-size:18px;line-height:1.6}
${s} [data-pica-part="middle"]{display:grid;grid-template-columns:2fr 1fr;border-top:1px solid ${fg};border-bottom:1px solid ${fg}}
${s} [data-pica-part="map"]{padding:28px 28px 20px 0}
${s} [data-pica-part="map"] figcaption{color:${muted};font-size:9px;margin-top:16px}
${s} [data-pica-part="map-number"]{font-family:${GRID_FONT};font-size:15px;fill:currentColor;stroke:none}
${s} [data-pica-part="map-label"]{font-family:${GRID_FONT};font-size:10px;fill:currentColor;stroke:none;letter-spacing:2px}
${s} [data-pica-part="key"]{border-left:1px solid ${fg};padding:26px 0 26px 30px;display:grid;gap:14px;align-content:start;font-size:14px}
${s} [data-pica-part="distance"]{font-family:${GRID_FONT};font-size:90px;line-height:1;letter-spacing:-.08em}
${s} [data-pica-part="stops"]{padding-top:34px}
${s} [data-pica-part="itinerary"]{list-style:none;padding:0;margin:25px 0 0;border-top:1px solid ${fg}}
${s} [data-pica-part="stop"]{display:grid;grid-template-columns:50px 1.4fr 1.3fr 1fr;gap:20px;padding:20px 0;border-bottom:1px solid ${muted};align-items:start}
${s} [data-pica-part="stop-number"]{font-family:${GRID_FONT};font-size:16px;color:${fg};border-left:3px solid ${accent};padding-left:8px}
${s} [data-pica-part="address"]{font-family:${GRID_FONT};font-size:11px;margin-top:6px;color:${muted}}
${s} [data-pica-part="event"]{font-size:14px;display:grid;gap:8px}
${s} [data-pica-part="access-note"]{font-size:12px;color:${muted}}
${s} [data-pica-part="access"]{display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-top:34px;font-size:14px}
${s} [data-pica-part="access"]>p:last-child{grid-column:2}
@media(max-width:900px){${s} [data-pica-part="opening"]{gap:35px}${s} [data-pica-part="distance"]{font-size:65px}${s} [data-pica-part="stop"]{grid-template-columns:36px 1.2fr 1fr}${s} [data-pica-part="access-note"]{grid-column:2/-1}}
@media(max-width:600px){${s} [data-pica-part="map-number"]{font-size:24px}${s} [data-pica-part="map-label"]{font-size:16px}${s} [data-pica-part="opening"]{grid-template-columns:1fr;gap:22px;padding:26px 0 30px}${s} [data-pica-part="opening"] h1{font-size:62px}${s} [data-pica-part="intro"] p{font-size:16px}${s} [data-pica-part="middle"]{grid-template-columns:1fr}${s} [data-pica-part="map"]{padding-right:0}${s} [data-pica-part="key"]{border-left:0;border-top:1px solid ${fg};padding:20px 0;grid-template-columns:1fr 1fr}${s} [data-pica-part="key"]>span:first-child{grid-column:1/-1}${s} [data-pica-part="key"]>p{grid-column:1/-1}${s} [data-pica-part="distance"]{font-size:58px}${s} [data-pica-part="stop"]{grid-template-columns:30px 1fr;gap:10px 15px}${s} [data-pica-part="event"],${s} [data-pica-part="access-note"]{grid-column:2}${s} [data-pica-part="access"]{grid-template-columns:1fr;gap:15px}${s} [data-pica-part="access"]>p:last-child{grid-column:auto}}
`;
}

export const mount: Mount<FestivalRouteProps> = (host, initial = {}) => {
  let props: FestivalRouteProps = { ...defaults, ...initial };
  const attributes = hostAttributes(host);
  const container = routeNode("div", "");
  host.append(container);
  const sheet = scope(container);
  const page = routeNode("article", "");
  page.setAttribute("data-pica-page", "");
  container.append(page);
  const id = nextId("pica-festival-route");
  sheet.setRules(routeRules(sheet.selector));
  let destroyed = false;
  const render = (): void => {
    attributes.set("aria-hidden", "false");
    attributes.set("role", "region");
    attributes.set("aria-label", props.title);
    page.replaceChildren();
    const top = routeNode("header", "top");
    top.append(routeNode("span", "label", props.neighbourhood));
    const nav = routeNode("nav", "");
    nav.setAttribute("aria-label", "Walk sections");
    nav.append(routeLink("The route", `${id}-map`), routeLink("All stops", `${id}-stops`), routeLink("Good to know", `${id}-access`));
    top.append(nav);
    const opening = routeNode("div", "opening");
    opening.append(routeNode("h1", "", props.title));
    const intro = routeNode("div", "intro");
    intro.append(routeNode("span", "label", props.date), routeNode("p", "", props.introduction));
    opening.append(intro);
    const middle = routeNode("section", "middle");
    middle.id = `${id}-map`;
    const figure = routeNode("figure", "map");
    const rows = Math.max(1, Math.ceil(props.venues.length / 3));
    const height = Math.max(360, rows * 105 + 150);
    const drawing = routeSvg("svg", { viewBox: `0 0 640 ${height}`, role: "img", "aria-label": "Schematic neighbourhood route. Stops are numbered in itinerary order; the drawing is not to scale." });
    drawing.append(routeSvg("path", { d: `M20 ${height - 45}Q210 ${height - 115} 305 ${height - 72}T620 ${height - 95} M20 ${height - 25}Q210 ${height - 95} 305 ${height - 52}T620 ${height - 75}`, "stroke-width": "2" }));
    for (const x of [85, 320, 555]) drawing.append(routeSvg("path", { d: `M${x} 25V${height - 130}`, "stroke-dasharray": "2 6" }));
    for (let row = 0; row < rows; row++) drawing.append(routeSvg("path", { d: `M25 ${85 + row * 105}H615`, "stroke-dasharray": "2 6" }));
    const positions = props.venues.map((_, i) => {
      const row = Math.floor(i / 3);
      return [85 + (row % 2 === 0 ? i % 3 : 2 - i % 3) * 235, 85 + row * 105] as const;
    });
    for (const [i, point] of positions.entries()) {
      const [x, y] = point;
      const previous = positions[i - 1];
      if (previous) {
        const dx = Math.sign(x - previous[0]);
        const dy = Math.sign(y - previous[1]);
        drawing.append(routeSvg("path", { d: `M${previous[0] + dx * 21} ${previous[1] + dy * 21}L${x - dx * 21} ${y - dy * 21}`, "stroke-width": "3", "data-pica-part": "accent" }));
      }
      drawing.append(routeSvg("rect", { x: String(x - 18), y: String(y - 18), width: "36", height: "36", "stroke-width": "2" }));
      const text = routeSvg("text", { x: String(x), y: String(y + 6), "text-anchor": "middle", "data-pica-part": "map-number" });
      text.textContent = String(i + 1).padStart(2, "0");
      drawing.append(text);
    }
    const river = routeSvg("text", { x: "55", y: String(height - 50), "data-pica-part": "map-label" });
    river.textContent = "RIVER EAST";
    drawing.append(river);
    figure.append(drawing, routeNode("figcaption", "label", "Schematic / follow the numbered route / not to scale"));
    const key = routeNode("aside", "key");
    key.setAttribute("aria-label", "Walk overview");
    key.append(routeNode("span", "label", "A walk at your own pace"), routeNode("div", "distance", "2.4"), routeNode("span", "label", "kilometres / about 40 minutes"), routeNode("p", "", "Begin anywhere. Stay as long as you like. The full route follows paved streets and the level riverside path."), routeNode("p", "muted", "Look for the numbered signs at each doorway."));
    middle.append(figure, key);
    const stops = routeNode("section", "stops");
    stops.id = `${id}-stops`;
    stops.append(routeNode("h2", "", `${props.venues.length} doors, one neighbourhood`));
    const itinerary = routeNode("ol", "itinerary");
    for (const [i, venue] of props.venues.entries()) {
      const stop = routeNode("li", "stop");
      stop.append(routeNode("span", "stop-number", String(i + 1).padStart(2, "0")));
      const place = routeNode("div", "place");
      place.append(routeNode("h3", "", venue.name), routeNode("p", "address", venue.address));
      const event = routeNode("div", "event");
      event.append(routeNode("p", "", venue.event), routeNode("p", "label", venue.time));
      stop.append(place, event, routeNode("p", "access-note", venue.access));
      itinerary.append(stop);
    }
    stops.append(itinerary);
    const access = routeNode("section", "access");
    access.id = `${id}-access`;
    access.append(routeNode("span", "label", "Everyone is welcome"), routeNode("p", "", "All events are free and drop-in. Children are welcome with an adult. Pick up a printed route at any venue. Water refill points are available at Canal Yard and Glasshouse."), routeNode("p", "muted", "Wet weather plan: outdoor performances move to the Former Post Office. Ask a steward for the latest information."));
    const footer = routeNode("footer", "footer");
    footer.append(routeNode("span", "label", "Made possible by the people of Eastbank"), routeLink("Back to the route ↑", `${id}-map`));
    page.append(top, opening, middle, stops, access, footer);
    attributes.set("data-pica-ready", "true");
  };
  render();
  return {
    update(next) {
      if (destroyed) return;
      const before = props;
      props = { ...props, ...next };
      if (!sameJson(before, props)) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      container.remove();
      sheet.destroy();
      attributes.restore();
    },
  };
};
