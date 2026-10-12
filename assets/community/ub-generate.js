// Builder page, "Real patterns, not guesses": a Community component (Event
// Card With Attendees) generates in the card, over and over, with the
// transitions-ui-generation skill's runtime (assets/ui-generation). The
// drawing is quieter than the skill's default (community.css, .t-gen.is-quiet)
// and stays inside the card. It only runs while the card is on screen, and
// not at all with reduced motion: the component simply sits there.
import { generate } from "../ui-generation/ui-generation.js?v=1";

const card = document.querySelector("[data-ub-generate]");
const stage = card && card.querySelector(".ub-gen");

// The component in its own shadow root, so its styles and class names never
// meet the page's. Its :root tokens and dark rules move to the host, and its
// script gets a document scoped to that root (as in the skill's demo).
function mount(c) {
  const host = document.createElement("div");
  host.className = "ub-gen-host";
  const theme = () => { host.dataset.theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light"; };
  theme();
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const root = host.attachShadow({ mode: "open" });
  const css = c.css
    .replace(/html\[data-theme="dark"\]\s*\{/g, ':host([data-theme="dark"]) {')
    .replace(/html\[data-theme="dark"\]\s+/g, ':host([data-theme="dark"]) ')
    .replace(/:root\b/g, ":host");
  root.innerHTML = `<style>${css}</style>${c.html}`;
  stage.append(host);
  const scoped = new Proxy(document, {
    get(target, prop) {
      if (prop === "querySelector" || prop === "querySelectorAll") return (...a) => root[prop](...a);
      if (prop === "getElementById") return (id) => root.querySelector("#" + CSS.escape(id));
      if (prop === "documentElement" || prop === "body") return host;
      const v = Reflect.get(target, prop);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  try { new Function("document", c.js)(scoped); } catch (e) { console.warn("ub-generate", e); }
  return [...root.children].find((n) => n.tagName !== "STYLE");
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let onScreen = false, wake = null;
const awake = () => new Promise((r) => { if (onScreen && !document.hidden) r(); else wake = r; });
const nudge = () => { if (wake && onScreen && !document.hidden) { const w = wake; wake = null; w(); } };

// The drawing sits on the page over the component; keep it inside the card.
function quiet(el) {
  const layer = el.__tGenLayer;
  if (!layer || layer.classList.contains("is-quiet")) return;
  layer.classList.add("is-quiet");
  const c = card.getBoundingClientRect(), l = layer.getBoundingClientRect();
  // Negative insets reach past the layer's own box (its drawing overflows it)
  // out to the card's edges, and the card's rounded corners.
  layer.style.clipPath = `inset(${c.top - l.top}px ${l.right - c.right}px ${l.bottom - c.bottom}px ${c.left - l.left}px round 24px)`;
}

async function loop(el) {
  for (;;) {
    await awake();
    const run = generate(el, { mode: "skeleton", duration: 2800 });
    // the overlay is built a frame or two later (el.__tGenLayer still holds
    // the last run's, already removed); style it as soon as it is on the page
    for (let i = 0; i < 30 && !(el.__tGenLayer && el.__tGenLayer.isConnected); i++) await new Promise((r) => requestAnimationFrame(r));
    if (el.__tGenLayer && el.__tGenLayer.isConnected) quiet(el);
    await run.finished;
    await wait(2600); // the real component rests before the next build
  }
}

async function start() {
  if (!stage) return;
  const c = await fetch("assets/community/ub-event-card.json?v=1").then((r) => r.json()).catch(() => null);
  if (!c) return;
  const el = mount(c);
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    if (!onScreen) { if (el.__tGen) el.__tGen.cancel(); } else nudge();
  }, { threshold: 0.35 }).observe(card);
  document.addEventListener("visibilitychange", () => { if (document.hidden && el.__tGen) el.__tGen.cancel(); else nudge(); });
  await document.fonts.ready;
  await Promise.all([...el.querySelectorAll("img")].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  loop(el);
}
start();
