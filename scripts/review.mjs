// Contact sheet for one wave: Keep, Revise with a note, or Cut. Decisions are written to review/wave-N.json.
// Usage: npm run review -- <wave>    Serves http://localhost:3200 from what `npm run verify` staged in .pica/.
// Zero dependencies on purpose: it must run before anything else in the repo builds.
import { createServer } from "node:http";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WORK = join(ROOT, ".pica");
const wave = Number(process.argv[2] ?? 1);
const LOG = join(ROOT, "review", `wave-${wave}.json`);
const PORT = Number(process.env.PICA_REVIEW_PORT ?? 3200);
const SLUG = /^[a-z0-9-]+$/;
const DECISIONS = ["keep", "revise", "cut"];

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function items() {
  const out = [];
  for (const dir of await readdir(WORK, { withFileTypes: true }).catch(() => [])) {
    if (!dir.isDirectory() || !SLUG.test(dir.name)) continue;
    const meta = await readJson(join(WORK, dir.name, "meta.json"), null);
    if (!meta || meta.wave !== wave) continue;
    out.push({ meta, verify: await readJson(join(WORK, dir.name, "verify.json"), null) });
  }
  return out.sort((a, b) => a.meta.slug.localeCompare(b.meta.slug));
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function card({ meta, verify }, decision) {
  const passed = verify ? verify.checks.filter((c) => c.ok).length : 0;
  const total = verify ? verify.checks.length : 0;
  const failing = verify ? verify.checks.filter((c) => !c.ok).map((c) => c.name).join(", ") : "not verified";
  // The same words as ORIGINAL_LABEL in scripts/config.ts, which this plain script cannot import.
  const credits =
    meta.original && meta.credits.length === 0
      ? "Original to Picagram."
      : meta.credits.map((c) => `${c.relation} ${c.title} (${c.author})`).join("; ");
  const chosen = decision?.decision ?? "";
  return `<article tabindex="0" data-slug="${escapeHtml(meta.slug)}" data-decision="${chosen}">
  <img class="shot" src="/capture/${escapeHtml(meta.slug)}/vanilla-1280.png" data-dark="/capture/${escapeHtml(meta.slug)}/vanilla-1280.png" data-light="/capture/${escapeHtml(meta.slug)}/vanilla-1280-light.png" alt="" loading="lazy">
  <h2>${escapeHtml(meta.title)} <span class="muted">${escapeHtml(meta.slug)}</span></h2>
  <p>${escapeHtml(meta.description)}</p>
  <p class="muted small">${escapeHtml(credits)}</p>
  <p class="small ${verify && verify.ok ? "" : "warn"}">verify ${passed} of ${total}${verify && !verify.ok ? ": " + escapeHtml(failing) : ""}</p>
  <textarea rows="2" placeholder="Why keep it, or what to change">${escapeHtml(decision?.note ?? "")}</textarea>
  <div class="row">${DECISIONS.map((d, i) => `<button type="button" data-choice="${d}" aria-pressed="${chosen === d}">${i + 1} ${d}</button>`).join("")}
    <button type="button" data-live>o live</button></div>
</article>`;
}

function page(list, log) {
  const decided = list.filter((item) => log[item.meta.slug]).length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Pica review, wave ${wave}</title>
<style>
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
:root { --ink: #0a0a0a; --paper: #f1f1ef; --muted: #8d8d8a; --line: #2c2c2c; --amber: #e8a020; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--ink); color: var(--paper); font: 14px/1.6 "IBM Plex Mono", ui-monospace, Menlo, monospace; }
header { position: sticky; top: 0; z-index: 2; display: flex; gap: 24px; align-items: baseline; padding: 12px 24px; background: var(--ink); border-bottom: 1px solid var(--line); }
h1, h2 { margin: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.muted { color: var(--muted); } .small { font-size: 12px; margin: 0; } .warn { color: var(--amber); }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1px; background: var(--line); }
article { display: flex; flex-direction: column; gap: 8px; padding: 16px; background: var(--ink); outline: none; }
article:focus-visible, article.active { outline: 1px solid var(--amber); outline-offset: -1px; }
article[data-decision="cut"] { opacity: 0.55; }
p { margin: 0; }
.shot { display: block; width: 100%; aspect-ratio: 1280 / 800; object-fit: cover; background: #000; border: 1px solid var(--line); cursor: zoom-in; }
textarea { width: 100%; font: inherit; color: var(--paper); background: transparent; border: 1px solid var(--line); padding: 6px 8px; resize: vertical; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
button { font: inherit; color: var(--paper); background: transparent; border: 1px solid var(--line); padding: 4px 10px; cursor: pointer; }
button[aria-pressed="true"] { border-color: var(--paper); background: var(--paper); color: var(--ink); }
dialog { width: 92vw; height: 88vh; padding: 0; border: 1px solid var(--line); background: var(--ink); }
dialog::backdrop { background: rgba(10, 10, 10, 0.85); }
dialog iframe { width: 100%; height: 100%; border: 0; display: block; }
kbd { border: 1px solid var(--line); padding: 0 4px; }
</style></head><body>
<header><h1>Pica review, wave ${wave}</h1><span class="muted"><span id="count">${decided}</span> of ${list.length} decided</span>
<button type="button" id="ground" aria-pressed="false">ground: dark</button>
<span class="muted small"><kbd>j</kbd> <kbd>k</kbd> move, <kbd>1</kbd> keep, <kbd>2</kbd> revise, <kbd>3</kbd> cut, <kbd>o</kbd> live, <kbd>l</kbd> light or dark, <kbd>esc</kbd> close</span></header>
<main>${list.map((item) => card(item, log[item.meta.slug])).join("\n") || '<p style="padding:24px">Nothing staged for this wave. Run npm run verify first.</p>'}</main>
<dialog id="live"><iframe title="Live component"></iframe></dialog>
<script>
const cards = [...document.querySelectorAll("article")];
const dialog = document.getElementById("live");
let active = 0;
function focus(i) { active = Math.max(0, Math.min(cards.length - 1, i)); cards.forEach((c, j) => c.classList.toggle("active", j === active)); cards[active]?.focus(); }
function openLive(card) { dialog.querySelector("iframe").src = "/live/" + card.dataset.slug; dialog.showModal(); }
const groundButton = document.getElementById("ground");
let lightGround = false;
function toggleGround() {
  lightGround = !lightGround;
  document.querySelectorAll(".shot").forEach((img) => { img.src = lightGround ? img.dataset.light : img.dataset.dark; });
  groundButton.textContent = "ground: " + (lightGround ? "light" : "dark");
  groundButton.setAttribute("aria-pressed", String(lightGround));
}
groundButton.addEventListener("click", toggleGround);
async function decide(card, decision) {
  const note = card.querySelector("textarea").value;
  const res = await fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: card.dataset.slug, decision, note }) });
  if (!res.ok) return;
  card.dataset.decision = decision;
  card.querySelectorAll("[data-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.choice === decision)));
  document.getElementById("count").textContent = cards.filter((c) => c.dataset.decision).length;
}
cards.forEach((card, i) => {
  card.addEventListener("focus", () => { active = i; cards.forEach((c, j) => c.classList.toggle("active", j === i)); });
  card.querySelector(".shot").addEventListener("click", () => openLive(card));
  card.querySelector("[data-live]").addEventListener("click", () => openLive(card));
  card.querySelectorAll("[data-choice]").forEach((b) => b.addEventListener("click", () => decide(card, b.dataset.choice)));
});
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLTextAreaElement) { if (e.key === "Escape") e.target.blur(); return; }
  const card = cards[active];
  if (e.key === "j") focus(active + 1);
  else if (e.key === "k") focus(active - 1);
  else if (card && ["1", "2", "3"].includes(e.key)) decide(card, ["keep", "revise", "cut"][Number(e.key) - 1]);
  else if (card && e.key === "o") openLive(card);
  else if (e.key === "l") toggleGround();
});
dialog.addEventListener("close", () => { dialog.querySelector("iframe").src = "about:blank"; });
focus(0);
</script></body></html>`;
}

function send(res, status, type, body) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 20_000) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  try {
    if (req.method === "GET" && url.pathname === "/") {
      return send(res, 200, "text/html; charset=utf-8", page(await items(), await readJson(LOG, {})));
    }
    const capture = /^\/capture\/([a-z0-9-]+)\/(vanilla|react)-(\d+(?:-light)?)\.png$/.exec(url.pathname);
    if (req.method === "GET" && capture) {
      return send(res, 200, "image/png", await readFile(join(WORK, "captures", capture[1], `${capture[2]}-${capture[3]}.png`)));
    }
    const live = /^\/live\/([a-z0-9-]+)$/.exec(url.pathname);
    if (req.method === "GET" && live) {
      return send(res, 200, "text/html; charset=utf-8", await readFile(join(WORK, live[1], "vanilla.html")));
    }
    if (req.method === "POST" && url.pathname === "/api/review") {
      const body = JSON.parse(await bodyOf(req));
      if (!SLUG.test(String(body.slug)) || !DECISIONS.includes(body.decision)) return send(res, 400, "text/plain", "bad request");
      const log = await readJson(LOG, {});
      log[body.slug] = { decision: body.decision, note: String(body.note ?? "").slice(0, 2000), at: new Date().toISOString() };
      await mkdir(join(ROOT, "review"), { recursive: true });
      await writeFile(LOG, `${JSON.stringify(log, null, 2)}\n`);
      return send(res, 200, "application/json", JSON.stringify(log[body.slug]));
    }
    send(res, 404, "text/plain", "not found");
  } catch (error) {
    send(res, 500, "text/plain", String(error));
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`Review wave ${wave}: http://localhost:${PORT}`));
