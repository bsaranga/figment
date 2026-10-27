# figment

**Codename:** `figment`
**Working title:** Canvas-native UI runtime + next-gen UI kit
**Date:** 2026-10-26
**Status:** Research validated → **competitive steal phase** (see [FEATURES.md](./FEATURES.md))
**Not yet greenlit for serious implementation**

---

## 1. Executive summary

Chrome shipped **HTML-in-Canvas** (stable in Chrome 157; refinements in Origin Trial through Chrome 160). It lets you draw **live, interactive, accessible DOM subtrees** into 2D, WebGL, or WebGPU canvas while the browser retains hit-testing, focus, forms, and the accessibility tree.

**Product thesis:** treat DOM as the universal interop layer, and ship a **full-stack GPU UI product**:

1. A **surface runtime** that mounts *any* framework's DOM into a canvas (paint scheduling, geometry, hit-test, DPR, dirty rects).
2. A **GPU framework** — effects, materials, lights, tilt, motion, custom shaders.
3. A **spatial UI kit** + infinite-canvas shell for next-gen app UIs (panels, command palettes, game HUDs).
4. **Deep FE-framework integration** — React/Vue/Svelte/Angular/HTMX DOM works unchanged; Web Components kit; optional thin bindings.

**Constraint (user decision):** ship **no fallback**. Target HTML-in-Canvas Chrome-OT only. Missing API throws typed `FigmentUnsupportedError`. Tilt/projective layers are **in scope**.

### Headline validation result

| Claim | Verdict |
|---|---|
| HTML-in-Canvas exists and does what we think | ✅ **Confirmed** (WICG explainer + Chrome docs + OT) |
| "Framework-agnostic host runtime" is wide open | ❌ **False — already being built** (Underglass, Prism) |
| "UI kit for spatial/next-gen app UI" is open | ✅ **Confirmed white space** |
| "No fallback, Chrome-OT only" is viable positioning | ⚠️ **Viable but narrow** — every competitor ships fallbacks |
| Product usefulness | **7.2 / 10** overall — **8.5** if reframed around UI kit + spatial shell |

**Recommendation:** do **not** ship a generic "host runtime" as the product. Ship the **spatial UI kit + infinite-canvas shell**, with a thin host layer as the foundation (possibly contributing to / learning from Prism). Proceed only if we accept Chrome-Canary audience and API churn through Chrome 160.

---

## 2. What HTML-in-Canvas actually is

Sources (verified 2026-10-26):

- WICG explainer: https://github.com/WICG/html-in-canvas (4.1k stars, active)
- Chrome docs: https://developer.chrome.com/docs/web-platform/html-in-canvas
- OT changes post: https://developer.chrome.com/blog/html-in-canvas-ot-changes
- Origin trial: https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849 (through Chrome 160)
- Flag: `chrome://flags/#canvas-draw-element` (plus `#enable-experimental-web-platform-features`)

### 2.1 API surface (validated against WICG IDL)

**Markup**

```html
<canvas content="drawable">
  <div id="panel" drawable>
    <h2>Title</h2>
    <button id="btn" drawable>OK</button>  <!-- nested drawable = independent paint root -->
  </div>
</canvas>
```

- `content` is a reflected enum: `"fallback"` (default) | `"drawable"`.
- `drawable` on a descendant implies `isolation: isolate` and is a containing block for descendants.
- A **drawable subtree** = element with `drawable` + descendants, **excluding** nested `drawable` subtrees.
- Nested `<canvas content="drawable">` paint events fire in **reverse tree order** (children before parents).

**Drawing**

| Context | Method | Notes |
|---|---|---|
| 2D | `ctx.drawElementImage(el, ...)` | 3/5/7/9-arg overloads + `DrawElementImageOptions` |
| WebGL | `gl.texElementSubImage2D(target, level, xoffset, yoffset, el, config?)` | Pre-allocate storage (`texImage2D` with `null`) |
| WebGPU | `queue.drawElementImageToTexture(source, dest)` | `GPUDrawElementImageSource` / `GPUDrawElementImageDestination` |

Also:

- `canvas.captureElementImage(el)` → `ElementImage` (Transferable → workers / OffscreenCanvas).
- `canvas.getElementImageDefaultSize(el)` → size in **canvas grid pixels**.
- `canvas.getElementTransform(el)` → `DOMMatrix` (border-box, before CSS transforms → canvas).
- `canvas.updateElementGeometry(el, { canvasTransform, canvasClip, preserveHitTestOrder })`.
- `canvas.clearElementGeometry(el)`.
- `{ preserveElementGeometry: true }` on `drawElementImage` disables automatic 2D geometry sync.

**Paint lifecycle**

- `paint` event (`CanvasPaintEvent` with `changedElements: FrozenArray<Element>`).
- Fires just after intersection-observer steps in *update-the-rendering*; once per rendering update (no loop).
- DOM mutations inside `paint` land **next** frame; drawing calls land **current** frame.
- `canvas.requestPaint()` schedules one paint even if nothing changed (like `requestAnimationFrame`).
- Nested canvases: reverse tree order. OffscreenCanvas: `onelementgeometryupdate` after batched geometry.

**Geometry / hit-testing**

- 2D: `drawElementImage` auto-syncs geometry (disable with `preserveElementGeometry`).
- WebGL/WebGPU: **must** call `updateElementGeometry` (browser cannot infer texture→screen mapping).
- Hit-test stack: ordered list of drawable descendants; `preserveHitTestOrder: true` avoids restacking.
- Undrawn elements are in the a11y tree **without geometry** (screen readers see them; magnifiers can filter).

**Sizing / units** (this is where most early adopters get blur bugs)

| Value | Unit |
|---|---|
| `canvas.width/height`, 2D draw params | canvas grid px |
| `sourceX/Y/Width/Height`, element geometry, DOM measurements | CSS px |
| `devicePixelContentBoxSize` | device px |
| texture sizes | texture px (default = element size in canvas grid, rounded up) |

Best practice: `ResizeObserver` with `box: 'device-pixel-content-box'`, set canvas grid = device px, keep `scaleX/scaleY` for CSS→grid conversion.

**Security (read-back-allowed rendering)**

Snapshots exclude: cross-origin iframes/images/SVG refs, system colors, spelling markers, visited links, autofill, subpixel AA, video controls/captions, IME popups. Pixel readback is allowed; sensitive pixels are simply not drawn.

**Workers / OffscreenCanvas**

`ElementImage` is Transferable. Geometry updates from workers are microtask-batched and posted to main thread; `elementgeometryupdate` reports completion.

### 2.2 API churn (must design for this)

| Chrome | Change |
|---|---|
| < 150 | `texElementImage2D` 6-arg; `copyElementImageToTexture` loose args; `layoutsubtree` boolean attr |
| 150 | Arg cleanup; dict-style WebGPU params |
| 155 | `texElementSubImage2D` rename + pre-allocation; `drawElementImageToTexture` rename; `content="drawable"` replaces `layoutsubtree`; nested `drawable`; 2D auto-geometry (`drawElementImage` returns void) |
| 157 | Shipped (stable path) |
| OT → 160 | Refinements still landing |

**Implication:** any library must feature-detect method presence **and** arity (see OT post's cross-version snippets), not just property existence. Underglass uses **functional probes** (pixel readback + `elementFromPoint`) — better than property sniffing.

### 2.3 Known open issues (WICG, Oct 2026)

| Issue | Impact on us |
|---|---|
| [#186](https://github.com/WICG/html-in-canvas/issues/186) `canvasClip` hit-test uses AABB under rotated transform | Rotated clipped panels mis-hit |
| [#85](https://github.com/WICG/html-in-canvas/issues/85) no `removedElements` in paint event | Must track DOM removal ourselves |
| [#148](https://github.com/WICG/html-in-canvas/issues/148) precise hit testing | Coarse hit areas |
| [#151](https://github.com/WICG/html-in-canvas/issues/151) responsive canvas sizing | Manual ResizeObserver required |
| [#146](https://github.com/WICG/html-in-canvas/issues/146) non-TL positioning (RTL) | RTL panels awkward |
| [#126](https://github.com/WICG/html-in-canvas/issues/126) make `<canvas>` optional | Future simplification |
| [#170](https://github.com/WICG/html-in-canvas/issues/170) ancestors of drawn elements as on-screen | Intersection/lifecycle edge cases |
| [#79](https://github.com/WICG/html-in-canvas/issues/79) `backdrop-filter` with canvas as backdrop root | Glass UI limited |

Chromium bugs from field reports (Underglass / RaananW):

- crbug 573454036 — canvasClip hit-test AABB (same as #186)
- crbug 576333009 — nested `<canvas>` in a drawable captures blank unless it itself has `content="drawable"`
- crbug 576333010 — OffscreenCanvas commits raise no `paint` event
- DPR 1 text rasterization may differ from on-screen (subpixel vs greyscale AA)

---

## 3. Competitive landscape (validated)

| Project | Stars | What it is | Overlap with figment | Gap we could own |
|---|---|---|---|---|
| **[CanvasUI](https://canvasui.dev)** `DavidHDev/canvas-ui` | **5.1k** | 35 decorative effects (Liquid, Glass, Blaze…) over live DOM; shadcn registry; React/Vue/Svelte/Solid/Preact/vanilla; WebGL+WebGPU via vgpu | Marketing mindshare for "HTML-in-Canvas UI"; already framework-agnostic distribution | **Not app UI.** No forms, modals, command palettes, lists, spatial shell. Effects only |
| **[Underglass](https://github.com/RaananW/underglass)** `@underglass/core|react|vue` | 0 (new) | **React/Vue app UI presented through WebGPU.** Typed `Surface`/`Box`, motion, shader effects, native interaction preserved. `@underglass/ui` "Strata" design language. Apache-2.0 | **Direct competitor** to "host runtime + framework integration" | React/Vue-first, WebGPU-only, not published, no infinite canvas, SSR unsupported, no command-palette/panel kit |
| **[Prism](https://github.com/synthesiseng/prism)** `@synthesisengineering/prism` | 2 | **2D-first runtime** for managed DOM surfaces in canvas apps. `CanvasRuntime`, `registerSurface`, paint lifecycle, CSS↔canvas helpers, `paintOnce()` export. MIT. Alpha 0.1.0-alpha.8 | **Direct competitor** to host runtime (any DOM) | 2D only ("WebGL/WebGPU future-facing"), no UI kit, fallback draws placeholders, "your app owns the scene" |
| **[three-html-render](https://github.com/repalash/three-html-render)** | — | Polyfill + Three.js HTMLTexture; works in all browsers | Three.js texture path | Three.js only |
| **html-in-canvas-polyfill** (`@giuseppe-scotto-lavina/…`) | — | Native-first polyfill | Compat layer | Polyfill only (we don't want this) |
| **Engine integrations** | — | Three.js `HTMLTexture`, Babylon `HtmlTexture`, PlayCanvas, PixiJS `HTMLSource` | Texture bridges | Not UI infrastructure |
| **@remotion/canvas-capture** | — | HTML-in-Canvas → video | Export path | Remotion ecosystem |

### 3.1 What this means

**We are NOT first to "framework-agnostic host runtime."** Underglass (WebGPU, React/Vue) and Prism (2D, any DOM) are already building it. Both are early (0–2 stars, alpha/experimental) — the window is still open, but the *concept* is taken.

**CanvasUI owns "make it look cool."** 5.1k stars, shadcn distribution, MCP-ready. Competing on effects is suicide.

**What is genuinely open:**

1. **Spatial / infinite-canvas app shell** (Figma-like, whiteboard, editors) — nobody.
2. **Product UI kit** — CommandPalette, Modal/Sheet, VirtualList, forms, ContextMenu as canvas-native components with full a11y. Underglass has `Strata` (design language) but not this component set.
3. **Equal-footing multi-backend** (2D + WebGL + WebGPU as first-class). Prism=2D, Underglass=WebGPU.
4. **Game/HUD UI that screen readers can use** — nobody.
5. **Chrome-OT-native-only positioning** (no fallback) — everyone else degrades; we refuse to. Honest, opinionated, smaller audience.

---

## 4. Product design (reframed)

### 4.1 Positioning

> **figment — the full stack for canvas-native apps.**
> Surface runtime + GPU framework + spatial UI kit. Real DOM from any front-end framework. Interactive, accessible, GPU-composited. Chrome HTML-in-Canvas only.

Not a framework lock-in. Not a effects-only library. Not a polyfill.

### 4.2 Stack

```
┌─────────────────────────────────────────────────────────┐
│  @figment/ui          spatial + product components      │
│  InfiniteCanvas · SpatialPanel · CommandPalette ·       │
│  Modal · Toast · VirtualList · Form controls · HUD      │
├─────────────────────────────────────────────────────────┤
│  @figment/gpu         effects · materials · lights      │
│  ripple/chromatic/dissolve · defineEffect (WGSL) ·      │
│  relief/stage/glass · emitters · tilt · motion          │
├─────────────────────────────────────────────────────────┤
│  @figment/host        surface runtime                   │
│  paint coalescing · dirty rects · DPR/units ·           │
│  geometry sync · hit-test stack · nested drawables      │
│  backends: 2D | WebGL | WebGPU (equal footing)          │
├─────────────────────────────────────────────────────────┤
│  HTML-in-Canvas (Chrome OT / flag)  —  NO FALLBACK      │
└─────────────────────────────────────────────────────────┘
        ▲ any FE framework's DOM mounts here ▲
   React · Vue · Svelte · Angular · HTMX · Web Components
```

**Framework story (the real "deep integration"):**

- Components ship as **Web Components + CSS** (or plain HTML templates).
- Host takes any DOM tree (`host.mount(el)`). React/Vue/Svelte/Angular/HTMX/vanilla all work because they all emit DOM. State management, routing, component model — unchanged.
- Optional thin bindings (`@figment/react` etc.) for ergonomics — **not** required.
- Interop guarantees: real events, focus, forms, IME, screen readers.

### 4.3 Why no fallback (accepted tradeoffs)

| Upside | Downside |
|---|---|
| Tiny codebase, no html2canvas/SVG-foreignObject mess | Chrome Canary/Dev + OT token only |
| Perfect fidelity, zero approximation bugs | API churn through Chrome 160 |
| Forces us to master the real API | No Safari/Firefox/production Chrome stable users yet |
| Clear story for power users / design tools / games | Competitors all ship fallbacks and look "more compatible" |
| Smaller surface = faster to correctness | Adoption gated on Chrome OT enthusiasm |

**Hard gate:** this product is for people already building on HTML-in-Canvas (games, creative tools, spatial apps). Not for marketing sites.

### 4.4 Component scope (v1)

| Cluster | Components | Why |
|---|---|---|
| **Spatial shell** | `InfiniteCanvas`, `SpatialPanel`, `LayerStack`, `Minimap` | Fully open white space |
| **Product chrome** | `CommandPalette`, `Modal`, `Toast`, `ContextMenu`, `Tooltip` | Needed by every spatial app |
| **Data** | `VirtualList`, `VirtualGrid` | Perf on canvas is non-trivial |
| **Forms** | input, select, slider, checkbox (native semantics preserved) | A11y moat |
| **Game / HUD** | `HudLayer`, `WorldSpacePanel` | Accessible game UI = unique |

**Out of scope (do not build):** decorative shader effects (CanvasUI owns), Three.js/Babylon texture bridges (engines own), export-to-PNG libraries (Prism has `paintOnce`), polyfills.

### 4.5 Host runtime responsibilities (thin)

Must handle (every early adopter reimplements these):

1. `content="drawable"` / `drawable` attribute management + nested drawables
2. Paint coalescing (`paint` + `requestPaint` + rAF), dirty-rect use of `changedElements`
3. CSS ↔ canvas grid ↔ device px (`ResizeObserver` + `devicePixelContentBoxSize`)
4. Geometry: 2D auto-sync vs WebGL/WebGPU `updateElementGeometry`; hit-test stack (`preserveHitTestOrder`)
5. Nested canvas ordering; `clearElementGeometry` for unmount
6. API shape detection across Chrome 150/155/157+ (method presence **and** arity)
7. Functional admission probes (learn from Underglass), not property sniffing
8. Workarounds for known bugs (nested canvas needs `content="drawable"` — crbug 576333009)

---

## 5. Usefulness ranking

Scored 1–10 for: market need, white space, technical feasibility on OT, defensibility, effort.

| Rank | Product idea | Score | Notes |
|---|---|---|---|
| **1** | **Full stack: runtime + GPU framework + spatial kit + any-FE integration** | **8.7** | Our positioning. Defensible if we ship the spine |
| **2** | Spatial UI kit + InfiniteCanvas shell alone | 8.5 | True white space; weaker without runtime/gpu |
| **3** | Accessible game/HUD UI kit | 7.5 | Unique story, niche audience |
| **4** | Multi-backend host runtime alone | 6.5 | Needed, but Underglass/Prism already here. Becomes commodity |
| **5** | Effects/materials alone | 6.0 | CanvasUI pressure; valuable as kit DNA |
| **6** | CommandPalette / product chrome kit | 7.0 | High utility, smaller moat |
| **7** | Export / snapshot (`paintOnce` style) | 5.5 | Prism covers readiness |
| **8** | Decorative effects as standalone product | 3.0 | CanvasUI owns it (5.1k stars) |
| **9** | Polyfill / fallback layer | 2.0 | Explicitly rejected |

**Overall product usefulness: ~8.5 / 10** as the full stack with any-framework integration as the spine.

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| API churn (renames already twice) | High | Centralize feature detection; pin OT range; track WICG issues |
| Underglass/Prism ship first with more polish | High | Differentiate on UI kit + spatial shell, not runtime |
| Chrome-OT-only shrinks TAM to near-zero | High | Accept; target design tools / game studios / creative devs |
| Nested-canvas / clip hit-test bugs break product UI | Medium | Document workarounds; contribute repros to WICG |
| A11y hard to get right (geometry-less elements, focus rings) | Medium | Make a11y the moat; test with real AT |
| CanvasUI mindshare | Low | Don't compete on effects; link to them |
| OT expires / feature stalls | Medium | Watch chromestatus 5172548013916160 |

---

## 6b. Competitive steal phase (2026-10-26)

Deep-read of **Underglass** (`docs/api.md`, `docs/architecture.md`) and **Prism** (runprism.dev). Full feature matrix and steal/reject lists in **[FEATURES.md](./FEATURES.md)**.

**Headline:** Underglass is a far deeper GPU-first React framework than the README suggested — functional admission probes, seamless first enable, nested-canvas auto-mark, same-value mutation filter, Presence/transitions, materials, tilt. Prism is a cleaner, smaller "app owns scene / runtime owns surfaces" 2D model with public CSS↔canvas helpers and `paintOnce()` export.

**Steal (P0):** nested canvas `content="drawable"` mark/restore · same-value mutation filter · input/focus capture queue · functional admission probes · seamless first enable · complete-frame gating · direct GPU upload (no staging 2D).

**Steal (P1–P2):** canonical affine matrix · public unit helpers (Prism) · hit-test stack · transform origin · transparent clear + AA · NativeOverlay/NativeScroll · transition/Presence · `paintOnce` · diagnostics.

**Reject:** typed Layout/Appearance dialect · React-first product shape · WebGPU-only · CSS→WGSL compiler · materials/effects (CanvasUI owns) · placeholder fallback · 2D-only.

**Our edge remains:** spatial UI kit + InfiniteCanvas shell · equal multi-backend · Web Components + any DOM · no fallback · a11y-first HUD.

## 7. Validation checklist

- [x] HTML-in-Canvas is real, documented, in OT
- [x] API surface confirmed against WICG IDL (not just blog posts)
- [x] Breaking changes mapped (150 / 155 / 157)
- [x] Known bugs / open issues catalogued
- [x] Competitors identified including **non-obvious** ones (Underglass, Prism)
- [x] White space identified (spatial UI kit, infinite canvas, multi-backend, a11y game UI)
- [x] "No fallback" tradeoff written down
- [x] Usefulness ranked with scores
- [ ] **Decision: proceed / pivot / park** ← human gate

---

## 7b. Decisions (locked 2026-10-26)

| Decision | Choice |
|---|---|
| Tilt / projective layers | **In scope** — steal Underglass path; admission-probe hit-testing, refuse mode on failure |
| Missing API behavior | **Typed `FigmentUnsupportedError`** — no fallback, no placeholders, no `backend: "auto"` |
| Kit distribution | Deferred |
| Exec summary | [EXEC_SUMMARY.md](./EXEC_SUMMARY.md) — non-GPU-expert audience |

## 8. Recommended next step

**Do not start serious implementation until we choose a lane:**

| Lane | What we build | Risk |
|---|---|---|
| **A. Spatial UI kit (recommended)** | `@figment/ui` + thin host. Hero: InfiniteCanvas + CommandPalette + SpatialPanel | Medium. White space, but needs demos |
| **B. Host runtime** | Fight Underglass/Prism on DX | High. Commodity risk |
| **C. Park** | Wait for HTML-in-Canvas to ship stable / other engines | Opportunity cost |

**Suggested first milestone if Lane A:** 3 working components on Chrome Canary with OT token — `InfiniteCanvas`, `SpatialPanel`, `CommandPalette` — using plain DOM (no framework), with one React demo mounting the same DOM.

---

## 9. Sources

1. https://github.com/WICG/html-in-canvas — explainer + IDL (primary)
2. https://developer.chrome.com/docs/web-platform/html-in-canvas — overview, concepts, 2D/WebGL/WebGPU guides
3. https://developer.chrome.com/blog/html-in-canvas-ot-changes — Chrome 150/155 breaking changes
4. https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849 — OT through Chrome 160
5. https://github.com/GoogleChromeLabs/css-web-ui-demos/blob/main/html-in-canvas/awesome-html-in-canvas.md — ecosystem list
6. https://canvasui.dev / https://github.com/DavidHDev/canvas-ui — effects library (5.1k★)
7. https://github.com/RaananW/underglass — React/Vue WebGPU host (`@underglass/*`)
8. https://github.com/synthesiseng/prism — 2D surface runtime (`@synthesisengineering/prism`)
9. https://github.com/repalash/three-html-render — polyfill + Three.js
10. npm search `html-in-canvas`, `drawElementImage`, `canvas html draw element` (2026-10-26)
11. WICG issues #77, #79, #85, #126, #146, #148, #151, #170, #186, #187

---

*This document is a research artifact. Claims were checked against primary sources on 2026-10-26. Re-validate before implementation — the API is still in Origin Trial.*
