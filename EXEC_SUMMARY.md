# figment — Executive Summary

**Codename:** figment
**One-liner:** The full stack for spatial web apps — surface runtime, GPU framework (effects, materials, lights, tilt), and a UI kit — with real HTML from **any** front-end framework, staying clickable and accessible.
**Stage:** Research + competitive design complete. Chrome Origin Trial only. No production commitment yet.
**Date:** 2026-10-26

---

## 1. The problem

Two ways to build rich, interactive interfaces on the web today:

1. **Normal HTML/CSS** — accessible, easy to use, every framework supports it… but hard to treat as a *scene*. Want a UI panel floating at an angle in a 3D world? A toolbar that bends with a shader? An infinite whiteboard? You end up faking it.
2. **Canvas / WebGL / WebGPU** (drawing APIs for graphics and games) — full control over every pixel, effects, 3D… but you must *reimplement* buttons, text input, focus, screen readers. Games and creative tools rebuild UI from scratch and lose accessibility.

Until now there was no good middle ground. Libraries either approximate HTML as an image (blurry text, dead controls) or float HTML on top of the graphics (layering fights, no true compositing).

---

## 2. The unlock: HTML-in-Canvas

Chrome recently shipped **HTML-in-Canvas** (experimental; Origin Trial through Chrome 160). In plain terms:

> You can paint a **live HTML block** into a canvas or GPU scene — and it stays **alive**. Clicks, typing, focus rings, and screen readers still work on the real HTML underneath.

The browser keeps the real DOM (the page’s element tree) as the source of truth for interaction and accessibility, and separately gives you a snapshot of how it looks so you can draw it anywhere — flat, rotated, scaled, or as a texture on a 3D surface.

This is a **platform shift** for app UI: HTML becomes a first-class drawing material, not just a page.

**Constraint:** the feature is Chrome-only and still moving (APIs renamed twice this year). We are building **for this API only** — no “old-browser fallback.” If the API isn’t there, we fail fast with a clear error. That keeps the codebase small and the fidelity perfect.

---

## 3. What figment is

**figment** is a **complete GPU UI product** on top of HTML-in-Canvas: a **surface runtime** (manage HTML as canvas material), a **GPU framework** (effects, materials, lights, motion), a **spatial UI kit** (panels, palettes, lists, HUDs, infinite-canvas shell), and **deep integration with any front-end framework** (React, Vue, Svelte, Angular, HTMX, vanilla — via the DOM, no lock-in).

This is one product, four layers:

| Layer | What it is | Comparable to |
|---|---|---|
| **Surface runtime** | Mount, paint, hit-test, sync DOM ↔ pixels | Prism’s `CanvasRuntime` |
| **GPU framework** | Effects, materials, lights, tilt, compositing | Underglass core |
| **Spatial UI kit** | InfiniteCanvas, panels, palettes, HUD… | *Nobody ships this* |
| **Framework integration** | Any FE library’s DOM works unchanged | *Our unique stance* |

Not a pure effects library (CanvasUI owns hero-section fireworks).
Not React-only (Underglass).
Not 2D-only surfaces (Prism).

**Our lane:** the full stack for spatial, GPU-composited apps — runtime + framework + kit + shell — that any framework can adopt without rewriting its UI.

### Who it’s for

- Design tools and infinite whiteboards (Figma-like)
- Game UIs and accessible HUDs
- Creative / generative tools
- Spatial dashboards and AI agent workspaces
- Any app that wants HTML UI *inside* a 3D or canvas scene

### Who it’s not for

- Marketing sites (use normal HTML)
- Apps that need Safari/Firefox today
- Teams that want shader fireworks on a landing page (use CanvasUI)

---

## 4. Why this can win (competitive picture)

| Player | What they do | Gap |
|---|---|---|
| **CanvasUI** (5.1k★) | Decorative shader effects over live DOM (standalone wrappers) | Not app UI — no forms, palettes, lists, shells |
| **Underglass** | Deep React → GPU framework (WebGPU), typed layout, effects, materials | React-first, WebGPU-only, not a UI kit, unpublished |
| **Prism** | Simple 2D “register HTML surfaces on a canvas” runtime | 2D only, no UI kit, no spatial shell |
| **Three.js / Babylon / Pixi** | Put HTML on a 3D mesh as a texture | Engine bridges, not UI infrastructure |

**White space nobody owns:** one product that is *both* a GPU framework/surface runtime *and* a spatial UI kit — with **any FE framework’s DOM** as a first-class citizen (not React adapters over a core), equal 2D/WebGL/WebGPU backends, and effects/materials built into the kit rather than shipped as standalone demos.

We also **steal proven techniques** from Underglass/Prism (correctness workarounds, admission checks, coordinate helpers, export readiness) so we don’t rediscover their bugs. See [FEATURES.md](./FEATURES.md).

---

## 5. Architecture (plain language)

Think in four layers:

```
┌──────────────────────────────────────────────────────┐
│  @figment/ui     Components you use in your app       │
│                  InfiniteCanvas, SpatialPanel,        │
│                  CommandPalette, Modal, VirtualList,  │
│                  HUD… (Web Components + CSS)          │
├──────────────────────────────────────────────────────┤
│  @figment/gpu    Effects · materials · lights · tilt  │
│                  defineEffect (custom shaders)        │
│                  motion / presence / compositing      │
├──────────────────────────────────────────────────────┤
│  @figment/host   Surface runtime                      │
│                  Mount DOM as canvas material,        │
│                  paint updates, hit-testing, units,   │
│                  nested layers, diagnostics           │
├──────────────────────────────────────────────────────┤
│  HTML-in-Canvas  The browser capability (Chrome OT)   │
│                  NO fallback if missing               │
└──────────────────────────────────────────────────────┘
        ▲ any FE framework writes DOM into ▲
   React · Vue · Svelte · Angular · HTMX · vanilla
```

### Key ideas

1. **DOM is the universal connector.** React, Vue, Svelte, Angular, HTMX — they all produce DOM. We host that DOM. Deep integration means: mount your existing tree, keep your state management, keep your components. Optional thin bindings for ergonomics — **never required**.

2. **Surface runtime owns the hard parts.** Updating pixels when HTML changes, keeping clicks aligned when a panel is rotated, sizing for high-DPI screens, stacking hit targets, nested sub-panels. Every early adopter reimplements this; we ship it once.

3. **GPU framework owns the wow.** Effects (ripple, chromatic, dissolve), materials (glass, relief/depth, lit surfaces), emitters/lights, tilt — all applied to live HTML without cloning it. Custom shaders allowed via a safe `defineEffect` schema.

4. **Components are real HTML.** Buttons are `<button>`s. Inputs accept typing and IME. Screen readers work because the DOM is real — we only change *where it is drawn*. Materials may sit on live controls (lighting only); pixel-moving effects run on inert/decorative content.

5. **Three drawing backends, equal footing.**
   - **2D canvas** — simple 2D drawing API every browser has.
   - **WebGL** — older GPU API, widely supported, good for 3D and shaders.
   - **WebGPU** — newer GPU API, faster and more modern.
   Same runtime + kit works in all three; you pick at mount time.

6. **Tilt / 3D panels included.** A panel can be rotated in 3D (think: a card leaning back in space). We keep one transform (position + rotation + scale) that drives drawing, click targets, and DOM layout together so they never drift apart. Browser bugs around tilted hit-testing are probed at startup; if the browser can’t do it correctly, we refuse that mode rather than ship wrong clicks.

7. **No fallback.** If HTML-in-Canvas isn’t available, `createHost()` throws a typed `FigmentUnsupportedError` with instructions (Chrome + Origin Trial token). We do not silently draw placeholders or clone the UI.

---

## 6. Planned features

### Host / surface runtime (`@figment/host`)

| Area | Features |
|---|---|
| **Mounting** | Put any DOM subtree under a canvas; mark independent layers (`drawable`); nested layers |
| **Updates** | Repaint only what changed; skip no-op DOM writes; recapture on typing, focus, image load |
| **Correctness** | Nested `<canvas>` fix; functional “does it actually work?” probes on startup; no blank frames when layers change |
| **Geometry** | Click/hit areas synced to drawn position; stacking order; clip regions; 2D auto-sync + explicit 3D sync |
| **Units** | CSS pixels ↔ canvas pixels ↔ device pixels helpers (the #1 blur bug source) |
| **3D** | Tilt (rotate X/Y with perspective), **Z translate + shared camera**, transform origin, frame-edge policy |
| **Scroll stories** | Scroll progress drives camera/layer Z — “scroll into screen” fly-throughs on real HTML |
| **Compositing** | Transparent background so the page shows through; clean edge anti-aliasing |
| **App integration** | Overlay host for native dialogs; scrollable regions; form/input carets keep working |
| **Diagnostics** | `state()` — backend, health, counters |
| **Fail-fast** | Typed `FigmentUnsupportedError` — no silent degradation |

### GPU framework (`@figment/gpu`)

| Area | Features |
|---|---|
| **Effects** | ripple · chromatic · dissolve (bounded ops on a layer’s capture) |
| **Custom shaders** | `defineEffect` — trusted local WGSL color functions, frozen schema, compile-then-publish |
| **Materials** | relief (depth/bevel) · stage (decorative) · glass (refraction/dispersion) · objects/instrument (staged) |
| **Lights** | emitters (lamps/LEDs), pointer light, protected text rects so copy stays readable |
| **glTF parts** | 3D ornaments on panels (custom mesh profiles) — staged |
| **Motion** | transitions, staggered groups, enter/exit “presence” (toast dismiss, modal) |
| **Ownership contracts** | `decorative` (inert) · `inert` (transition-time) · `material` (safe on live controls) |
| **Export** | `paintOnce()` → wait for one clean frame (screenshots, OG images) |

### UI kit (`@figment/ui`)

| Cluster | Components |
|---|---|
| **Spatial shell** | `InfiniteCanvas` (pan/zoom world), `SpatialPanel`, `LayerStack`, `Minimap` |
| **Product chrome** | `CommandPalette` (glass), `Modal`, `Toast` (dissolve), `ContextMenu`, `Tooltip` |
| **Data** | `VirtualList`, `VirtualGrid` (only render visible rows — essential on canvas) |
| **Forms** | input, select, slider, checkbox — native semantics preserved |
| **Game / HUD** | `HudLayer`, `WorldSpacePanel` — accessible HUDs with emitters/lights |

Web Components + CSS custom properties → works in any framework (or none).

### Framework integration (cross-cutting)

| Mode | What you get |
|---|---|
| **Any DOM** | `host.mount(el)` — React/Vue/Svelte/Angular/HTMX just works |
| **Web Components** | Kit is framework-agnostic by default |
| **Optional bindings** | `@figment/react`, `/vue`, `/svelte` — thin ergonomics, not required |
| **Interop** | Real events, focus, forms, IME, screen readers unchanged |

### Explicitly out of scope

Hero-section effect packs as the product (CanvasUI’s lane), engine-specific texture bridges (Three/Babylon/Pixi), browser polyfills, old-browser fallbacks, SSR.

---

## 7. Product decisions (locked)

| Decision | Choice |
|---|---|
| 3D tilt / projective panels | **Yes — in scope** (admission-probed) |
| Fallback when API missing | **None** — throw `FigmentUnsupportedError` |
| Kit distribution (npm vs copy-paste registry) | **Deferred** |

---

## 8. Risks (honest)

| Risk | Severity | Mitigation |
|---|---|---|
| API still churns in Origin Trial | High | Centralize feature detection; pin Chrome range; track WICG |
| Chrome-only + no fallback shrinks audience | High | Accept; target design tools, game studios, creative devs |
| Underglass/Prism move faster on runtime | Medium | Differentiate on UI kit + shell; steal their correctness work |
| Tilt hit-testing browser bugs | Medium | Probe at startup; refuse bad modes instead of wrong clicks |
| Accessibility edge cases (focus rings, magnifiers) | Medium | A11y is the moat; test with real assistive tech |
| Feature stalls or OT ends | Medium | Watch chromestatus; keep host thin so it can pivot |

---

## 9. Usefulness ranking (from research)

| Rank | Idea | Score |
|---|---|---|
| 1 | **Full stack: runtime + GPU framework + spatial kit + any-framework** | **8.7** |
| 2 | Spatial UI kit + InfiniteCanvas shell alone | 8.5 |
| 3 | Accessible game/HUD kit | 7.5 |
| 4 | Host/surface runtime alone | 6.5 (crowded) |
| 5 | Effects/materials alone | 6.0 (CanvasUI pressure) |
| 6 | Export/snapshot tools | 5.5 |
| 7 | Polyfill/fallback layer | 2.0 (rejected) |

**Overall: ~8.5 / 10** as the full product with any-framework integration as the spine; weaker if we ship only the kit or only the runtime.

---

## 10. Delivery plan

| Milestone | Deliverable |
|---|---|
| **M1** | Surface runtime: mount any DOM, paint updates, hit-testing, units, nested layers, fail-fast error. Plain DOM + one React demo. |
| **M2** | Tilt/3D panels + transform origin + admission probes. |
| **M3** | GPU framework: effects chain (ripple/chromatic/dissolve), relief/stage/glass materials. |
| **M4** | UI kit: `InfiniteCanvas`, `SpatialPanel`, `CommandPalette` (glass), `Toast` (dissolve). |
| **M5** | `VirtualList`, `HudLayer`, emitters/lights, `defineEffect`, `paintOnce` export, 3 vertical demos. |
| **M6** | Optional framework bindings (`/react`, `/vue`, `/svelte`); agent skill; docs. |

---

## 11. What we need from stakeholders

1. **Greenlight** to build M1 (host runtime) — or park until HTML-in-Canvas ships stable.
2. Agreement that **Chrome-OT-only** is the right bar for v1 (no fallback).
3. Target customers to validate against (e.g. one design-tool team, one game UI team).

---

## 12. Sources & deep docs

- [PROPOSAL.md](./PROPOSAL.md) — full research, API notes, competitor detail
- [FEATURES.md](./FEATURES.md) — feature steal list vs Underglass / Prism
- WICG HTML-in-Canvas explainer: https://github.com/WICG/html-in-canvas
- Chrome docs: https://developer.chrome.com/docs/web-platform/html-in-canvas

---

*Written for readers who may not know WebGL/WebGPU in depth. “GPU surface” = a drawing area where the graphics chip composes pixels; WebGL/WebGPU are the two browser APIs for talking to it. HTML-in-Canvas is how live HTML gets into that pipeline.*
