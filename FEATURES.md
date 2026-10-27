# figment — competitive steal list

**Phase:** Chrome OT land-grab
**Sources:** [RaananW/underglass](https://github.com/RaananW/underglass) · [synthesiseng/prism](https://github.com/synthesiseng/prism) · CanvasUI (effects only)
**Date:** 2026-10-26

Goal: absorb every proven host/runtime technique from Underglass + Prism, reject their product shape, and land the white space neither ships (spatial UI kit).

---

## 1. Feature inventory

### Legend
| Symbol | Meaning |
|---|---|
| ✅ | shipped / verified in that project |
| 🧪 | experimental / partial |
| ❌ | absent |
| 🎯 | **figment must steal** |
| ⛔ | reject for figment |

### 1.1 Host / runtime core

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| Mount any DOM under `content="drawable"` canvas | ✅ (React/Vue roots) | ✅ (any element) | 🎯 **any framework's DOM** |
| `drawable` attribute management | ✅ | ✅ | 🎯 |
| Nested `drawable` independent paint roots | ✅ | 🧪 | 🎯 |
| Paint coalescing + `requestPaint` | ✅ | ✅ | 🎯 |
| Dirty upload via `changedElements` only | ✅ | 🧪 | 🎯 |
| Stale-layer tracking (new slot, extent change, hidden resume) | ✅ | ❌ | 🎯 |
| Same-value mutation filtering | ✅ | ❌ | 🎯 |
| Nested canvas auto-`content="drawable"` mark/restore | ✅ | ❌ | 🎯 **critical bug workaround** |
| OffscreenCanvas stale-pixel invalidate hook | ✅ | ❌ | 🎯 |
| Side-effect attrs always recapture (`src`, canvas w/h) | ✅ | ❌ | 🎯 |
| `input`/`focus` queued captures (value isn't a mutation) | ✅ | ❌ | 🎯 |
| Opt-out attr for value-drawing presenters | ✅ `data-underglass-gpu-value` | ❌ | 🎯 rename: `data-figment-skip-capture` |
| Functional admission probes (pixel + `elementFromPoint`) | ✅ | ❌ (presence only) | 🎯 |
| Seamless first admission (no blank frames) | ✅ | ❌ | 🎯 |
| Complete-frame membership gating (no incomplete frames) | ✅ | ❌ | 🎯 |
| API shape detection (presence + arity) | ✅ functional probes | 🧪 | 🎯 functional, not sniff |
| Metric/diagnostics `state()` | ✅ deep | ✅ `diagnostics` | 🎯 lean version |

### 1.2 Geometry / hit-testing

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| 2D auto geometry sync | ✅ | ✅ | 🎯 |
| WebGL/WebGPU `updateElementGeometry` | ✅ | ❌ (2D only) | 🎯 all backends |
| Canonical affine matrix → hits + shader + DOM | ✅ | 🧪 | 🎯 |
| `getElementTransform` readback + validation | ✅ | ❌ | 🎯 |
| Hit-test stack (`preserveHitTestOrder`) | ✅ | ❌ | 🎯 |
| `clearElementGeometry` on unmount/retire | ✅ | ✅ dispose | 🎯 |
| Transform origin / pivot (`top-left`/`center`/`{x,y}`) | ✅ | ❌ | 🎯 |
| Projective tilt (`tiltX`/`tiltY`/`perspective`) + admission proof | ✅ | ❌ | 🎯 **IN SCOPE** (admission-gated) |
| `transform.z` + shared scene camera (fly-through depth) | 🧪 (tilt only) | ❌ | 🎯 **required for scroll-into-screen** |
| Scroll → Z scrub (`scrollTrack` / pin stage) | ❌ | ❌ | 🎯 **product differentiator** (Awwwards story sites) |
| `canvasClip` for clipped viewports | ✅ | ❌ | 🎯 |
| CSS↔canvas↔device px helpers | ✅ internal | ✅ **public helpers** | 🎯 steal Prism's public API |
| Frame-edge rotated layer policy | ✅ | ❌ | 🎯 |

### 1.3 Layout / authoring model

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| Typed `Layout`/`Appearance` → CSS compile | ✅ | ❌ | ⛔ use real CSS |
| `Surface` / `Box` components | ✅ | ❌ | ⛔ Web Components + CSS |
| Plain CSS / bring-your-own-styles | 🧪 `useSurfaceRef` | ✅ **default** | 🎯 **Prism's model** |
| Surface bounds in CSS px | ✅ | ✅ | 🎯 |
| App owns scene loop / render decisions | ⛔ framework owns | ✅ | 🎯 **Prism's boundary** |
| Build-time CSS → WGSL compiler | 🧪 | ❌ | ⛔ out of scope |
| SSR / hydration | ❌ | ❌ | ⛔ (OT-only, skip) |

### 1.4 Motion / presence

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| Declarative numeric `transition` | ✅ | ❌ | 🎯 |
| `transitionGroup` + stagger | ✅ | ❌ | 🎯 |
| `createMotion` managed source | ✅ | ❌ | 🎯 |
| `Presence` enter/exit retained subtree | ✅ | ❌ | 🎯 |
| `release({ freeze })` keep GPU on hand-back | ✅ | ❌ | 🎯 |
| Ownership of WAAPI/CSS animations | ✅ deep | ❌ | 🧪 v2 |
| Reduced motion / visibility pause / forced colors | ✅ | ❌ | 🎯 |
| Springs / shared elements / routes | ❌ | ❌ | ⛔ both fail; don't promise |

### 1.5 Effects / materials

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| Ripple / chromatic / dissolve | ✅ | ❌ | 🎯 **steal — powers kit effects** |
| Trusted custom WGSL `defineEffect` | ✅ | ❌ | 🎯 **steal — extensibility** |
| Materials (relief/objects/stage/instrument) | ✅ huge | ❌ | 🎯 **steal subset** — relief/stage first; objects/instrument staged |
| Emitters / lights / glass / glTF parts | ✅ | ❌ | 🎯 **steal** — glass HUDs, lit panels, 3D ornaments |
| Per-layer blended pass (no staging 2D) | ✅ | ❌ | 🎯 **direct GPU upload path** |
| Transparent clear (page bg shows through) | ✅ | 🧪 | 🎯 |
| Bilinear premultiplied + analytic AA | ✅ | ❌ | 🎯 |
| Layer budget (1..64, default 32) | ✅ | ❌ | 🎯 lean |

### 1.6 Scrolling / overlays / forms

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| `NativeScroll` container | ✅ | ❌ | 🎯 |
| `NativeOverlay` portal host (dialog/popover) | ✅ | ❌ | 🎯 |
| Radix Dialog integration (public portal container) | ✅ | ❌ | 🎯 pattern, not Radix lock-in |
| Text input caret/IME invalidate capture | ✅ | ❌ | 🎯 |
| `contenteditable` refuses GPU (stays DOM) | ✅ | ❌ | 🎯 policy |
| Forms stay native | ✅ | ✅ | 🎯 |

### 1.7 Workers / export

| Feature | Underglass | Prism | figment plan |
|---|---|---|---|
| OffscreenCanvas + `ElementImage` transfer | 🧪 worker compositor | ❌ | 🧪 v2 |
| `paintOnce()` export readiness | ❌ | ✅ | 🎯 **steal Prism** |
| PNG/video export helpers | ❌ | 🧪 `toBlob` guide | 🎯 thin |
| Build-time worker compositor | 🧪 | ❌ | ⛔ |

### 1.8 Product surface (the actual game)

| Feature | Underglass | Prism | CanvasUI | figment plan |
|---|---|---|---|---|
| Infinite canvas / pan-zoom shell | ❌ | ❌ | ❌ | 🎯 **HERO** |
| SpatialPanel / LayerStack / Minimap | ❌ | ❌ | ❌ | 🎯 **HERO** |
| CommandPalette / Modal / Toast / ContextMenu | ❌ | ❌ | ❌ | 🎯 |
| VirtualList / VirtualGrid | ❌ | ❌ | ❌ | 🎯 |
| Form controls kit | ❌ | ❌ | ❌ | 🎯 |
| Game HUD / WorldSpacePanel | ❌ | ❌ | ❌ | 🎯 |
| Decorative shader effects | ✅ | ❌ | ✅✅✅ | 🎯 **as kit-powered effects, not hero wrappers** |
| Design tokens / theme | 🧪 Strata | ❌ | 🧪 | 🎯 CSS vars |
| Agent skill for AI coding | ❌ | ✅ `prism-runtime` | ✅ MCP registry | 🎯 **steal both** |
| shadcn-style copy-paste registry | ❌ | ❌ | ✅ | 🧪 consider |
| Live demos as verticals | ✅ showcase | ✅ Atlantic/Composer/Atelier | ✅ playground | 🎯 |

---

## 2. Steal list (priority)

### P0 — ship in host v0.1 (bugs & correctness)

1. **Nested canvas auto-mark** — every `<canvas>` inside a layer gets `content="drawable"` while active; restore author's value on teardown. *(Underglass; crbug 576333009)*
2. **Same-value mutation filter** — ignore `setAttribute(name, same)` / `data = same`; always capture `src`, `srcset`, `href`, `poster`, canvas `width`/`height`. *(Underglass)*
3. **Input/focus capture queue** — value changes aren't mutations. *(Underglass)*
4. **OffscreenCanvas invalidate** — document that transfers need explicit `invalidate()` after draw. *(Underglass)*
5. **Functional admission** — pixel probe + `elementFromPoint` at transformed points; never property-sniff. *(Underglass)*
6. **Seamless first enable** — canvas `opacity:0; pointer-events:none` during probe; only swap when complete capture exists. *(Underglass)*
7. **Complete-frame membership gating** — keep last good frame until new layers have valid captures. *(Underglass)*
8. **Direct GPU path** — `drawElementImageToTexture` / `texElementSubImage2D`, no staging 2D. *(Underglass)*

### P1 — host v0.2 (geometry & units)

9. **Canonical affine matrix** — one matrix drives hits + shader + DOM. *(Underglass)*
10. **Public CSS↔canvas helpers** — `cssLengthToCanvasPixels`, `clientToCanvasPoint`, `cssPointToCanvasPixels`. *(Prism — nicer public API than Underglass internals)*
11. **Hit-test stack** + `preserveHitTestOrder` + `clearElementGeometry` on retire.
12. **Transform origin / pivot** on layers.
13. **Transparent clear** + bilinear premultiplied compositing + analytic edge AA.
14. **Layer budget** with explicit pixel budget + diagnostics.
15. **Reduced motion / visibility pause / forced-colors refresh.**

### P2 — host v0.3 (app integration)

16. **`NativeOverlay`-style portal host** — dialogs/popovers stay native, outside capture.
17. **`NativeScroll`** — scroll containers refresh captures without revoking GPU.
17b. **Scroll-into-screen Z-space** — shared camera + `transform.z` + `scrollTrack` scrub (pin stage). Must ship so teams can build Apple/Awwwards depth story sites with live HTML.
18. **Declarative `transition` / `transitionGroup` / `Presence`.**
19. **`paintOnce()` export readiness.** *(Prism)*
20. **`state()` / diagnostics** — backend kind, health `idle|pending|healthy|failed`, counters.
21. **Side-effect attribute list** as exported constant.

### P3 — distribution & DX

22. **Agent skill** (`skills/figment-runtime`) teaching the runtime contract. *(Prism)*
23. **MCP-ready component registry** (shadcn protocol). *(CanvasUI)*
24. **Vertical demos** as the marketing surface: infinite-canvas tool, spatial dashboard, game HUD. *(Prism's Atlantic/Composer/Atelier pattern)*

### P2b — effects & materials (2026-10-26 add; powers next-level kit)

25. **Effect chain: ripple / chromatic / dissolve** — bounded sampling ops on a layer's capture. *(Underglass)*
26. **`defineEffect` trusted WGSL** — frozen local color-function schema, bounded params, compile-then-publish. *(Underglass)*
27. **Materials: relief + stage first** — persistent shading on a layer (bevel/depth); brightness-factor contract so text contrast holds. *(Underglass)*
28. **Glass material** — refraction/dispersion over captured HTML (glass command palette, frosted panels). *(Underglass)*
29. **Emitters + pointer light + protected text rects** — lamps/LEDs that relight UI without recapture. *(Underglass)*
30. **Objects / instrument + glTF parts (staged)** — 3D ornaments on panels once kit surfaces need them. *(Underglass)*
31. **Interaction contracts** — `decorative` (inert only), `inert` (transition-time), `material` (may sit on live controls). *(Underglass)*

---

## 3. Reject list (do not steal)

| Item | From | Why reject |
|---|---|---|
| Typed `Layout`/`Appearance` dialect | Underglass | Fights CSS; locks authors; we use real CSS |
| `Surface`/`Box` as required API | Underglass | Web Components + plain HTML work with every framework |
| React/Vue-first adapters as the product | Underglass | "Works with any framework" means DOM is the ABI |
| WebGPU-only | Underglass | We want 2D + WebGL + WebGPU equal |
| CSS→WGSL compiler | Underglass | Massive complexity, niche payoff |
| ~~Instrument/relief/objects materials, lights, glass, glTF~~ | Underglass | **REVERSED — steal subset (2026-10-26).** relief + stage + glass + emitters first; objects/instrument + glTF parts staged behind kit components |
| ~~Ripple/chromatic/dissolve effects~~ | Underglass | **REVERSED — steal (2026-10-26).** Not competing with CanvasUI hero-section wrappers; shipping effects as first-class kit primitives (glass palette, dissolve toasts, lit panels) |
| Placeholder / DOM fallback | Prism + Underglass | **User constraint: no fallback** |
| 2D-only | Prism | Too narrow for spatial UI |
| "Your app owns the scene loop" as the only mode | Prism | We need a turnkey shell *and* the low-level runtime |
| Deep phase/evidence acceptance process | Underglass | Overhead; we ship demos not certificates |

---

## 4. Do differently (our edge)

**Edge is the full stack + any-framework spine** — not "kit only" and not "runtime only":

| Area | Underglass / Prism | figment |
|---|---|---|
| **Product shape** | GPU framework (UG) *or* surface runtime (Prism) | **All of it:** surface runtime + GPU framework + spatial UI kit + shell |
| **Framework integration** | React/Vue adapters over core (UG) / raw DOM (Prism) | **Deep any-FE integration** — mount existing trees, optional thin bindings, Web Components kit |
| **Audience** | React/Vue apps that want shaders (UG) / canvas authors (Prism) | Design tools, game UIs, spatial apps, **any FE stack** |
| **Authoring** | Typed layout (UG) / bring scene (Prism) | **Web Components + CSS**, mount any DOM |
| **Backends** | WebGPU (UG) / 2D (Prism) | **2D + WebGL + WebGPU equal** |
| **Fallback** | Always | **Never (Chrome-OT only)** — typed `FigmentUnsupportedError` |
| **UI kit** | Strata (3D design language) | **Product chrome**: CommandPalette, Modal, VirtualList, HUD |
| **Shell** | None | **InfiniteCanvas, SpatialPanel, LayerStack, Minimap** |
| **A11y** | Preserved native | Preserved native **+ a11y-first HUD** story |
| **Effects/materials** | Framework feature (UG) / none (Prism) / hero wrappers (CanvasUI) | **Kit-built-in**: glass palette, lit panels, dissolve toasts + `defineEffect` |

---

## 5. Resulting v1 shape

```
@figment/host
  createHost(canvas, { backend: "2d"|"webgl"|"webgpu" })
  host.mount(anyDomRoot)
  host.layer(el, { transform, origin, clip })   // canonical matrix + tilt
  host.effect(id, { ripple | chromatic | dissolve | defineEffect })
  host.material(id, { relief | stage | glass | ... })
  host.setEmitters(id, lights)
  host.paint() / host.invalidate() / host.paintOnce()
  host.state()
  // throws FigmentUnsupportedError — no fallback

@figment/ui
  <figment-infinite-canvas>     // pan/zoom world
  <figment-spatial-panel>       // movable HTML panel (relief/glass materials)
  <figment-command-palette>     // glass material built-in
  <figment-modal> <figment-toast>  // dissolve enter/exit
  <figment-virtual-list>
  <figment-hud>                 // emitters, protected text

@figment/bindings (optional thin)
  react / vue / svelte helpers
```

**Milestone 1 (steal-and-ship):** host with P0+P1, plain DOM, one React demo mounting the same DOM.
**Milestone 2:** Tilt + `InfiniteCanvas` + `SpatialPanel` + `CommandPalette`.
**Milestone 3:** Effects chain + relief/stage/glass materials; HUD + VirtualList.
**Milestone 4:** Emitters/lights + `defineEffect` + objects/glTF; agent skill + vertical demos.

---

## 6. Decisions (locked 2026-10-26)

1. **Tilt / projective layers: IN SCOPE** — steal Underglass's tilt path (admission-probed hit-testing; refuse the mode if the browser can't do it correctly).
2. **No fallback: typed `FigmentUnsupportedError`** — no `backend: "auto"` silent degradation, no placeholders. Throw with OT install instructions.
3. **Kit distribution (npm vs shadcn registry): DEFERRED.**

### Still open

- License posture: learn from Underglass (Apache-2.0) and Prism (MIT) via clean-room design adoption; do not copy code.

---

*Feature claims verified against Underglass `docs/api.md` + `docs/architecture.md` and Prism `runprism.dev` docs on 2026-10-26. Underglass is unpublished/private-prep; Prism is `0.1.0-alpha.8`.*
