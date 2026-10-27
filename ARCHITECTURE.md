# figment — Architecture

**Scope:** full product surface for canvas-native apps on HTML-in-Canvas (Chrome OT only, no fallback).
**Docs:** [EXEC_SUMMARY.md](./EXEC_SUMMARY.md) · [PROPOSAL.md](./PROPOSAL.md) · [FEATURES.md](./FEATURES.md) · [PLAN.md](./PLAN.md)

---

## 1. Product surface

Four layers, one product. Lower layers have zero UI opinions; upper layers never talk to the browser API directly.

```
┌────────────────────────────────────────────────────────────────┐
│  apps & demos          any FE framework · verticals             │
├────────────────────────────────────────────────────────────────┤
│  @figment/ui           spatial kit + product chrome + HUD       │
│                        Web Components + CSS tokens              │
├────────────────────────────────────────────────────────────────┤
│  @figment/gpu          effects · materials · lights · motion    │
│                        defineEffect · tilt · compositing        │
├────────────────────────────────────────────────────────────────┤
│  @figment/host         surface runtime                          │
│                        mount · paint · geometry · units ·       │
│                        hit-test · admission · diagnostics       │
├────────────────────────────────────────────────────────────────┤
│  HTML-in-Canvas        browser capability (Chrome OT)           │
│                        missing API ⇒ FigmentUnsupportedError    │
└────────────────────────────────────────────────────────────────┘
        ▲ DOM in: React · Vue · Svelte · Angular · HTMX · WC ▲
```

**Dependency rule:** `ui → gpu → host → browser`. Never reverse. Optional `@figment/react|vue|svelte` depend on `ui` + `host` only (thin ergonomics).

---

## 2. Monorepo layout

```
figment/
  packages/
    host/                 @figment/host
    gpu/                  @figment/gpu
    ui/                   @figment/ui
    react/                @figment/react      (M6)
    vue/                  @figment/vue        (M6)
    svelte/               @figment/svelte     (M6)
  demos/
    vanilla-mount/        M1 — plain DOM
    react-mount/          M1 — same DOM via React
    spatial-shell/        M4 — infinite canvas
    glass-palette/        M4/M5 — kit + materials
    game-hud/             M5 — HUD + emitters
  docs/
  scripts/
  examples/               WICG-style repro fixtures
  tests/
    unit/
    browser/              Playwright + Chrome Canary + flags
```

Tooling: pnpm workspaces · TypeScript strict · Vite for demos · Vitest (unit) · Playwright (browser, Chrome Canary with `--enable-blink-features=CanvasDrawElement,ElementCanvasTransform --enable-experimental-web-platform-features`).

---

## 3. `@figment/host` — surface runtime

Owns: DOM ↔ canvas/GPU synchronization, geometry, hit-testing, units, lifecycle, diagnostics. No visual effects.

### 3.1 Public API (target)

```ts
// errors
class FigmentUnsupportedError extends Error {
  readonly reason: "missing-api" | "probe-failed" | "tilt-unsupported";
  readonly detail: string;
}

// entry
function createHost(target: HTMLCanvasElement | OffscreenCanvas, options?: {
  backend: "2d" | "webgl" | "webgpu";     // required — no "auto"
  devicePixelRatio?: number;
  budgets?: { layers?: number; pixels?: number };
}): Host;

interface Host {
  mount(root: ParentNode): Unmount;        // any framework's DOM
  layer(el: Element, opts?: LayerOpts): LayerHandle;
  // paint
  requestPaint(): void;
  invalidate(layer?: LayerHandle): void;
  paintOnce(): Promise<void>;              // export readiness
  // geometry
  setTransform(id: string, t: Transform): void;
  setOrigin(id: string, o: TransformOrigin): void;
  updateGeometry(id: string, g: { canvasTransform?: DOMMatrix; canvasClip?: DOMRect }): void;
  clearGeometry(id: string): void;
  // units
  cssToCanvas(n: number): number;
  clientToCanvas(p: {x:number;y:number}): {x:number;y:number};
  // lifecycle
  state(): HostState;
  destroy(): Promise<void>;
}

interface LayerOpts {
  id?: string;
  transform?: Transform;                   // x,y,scaleX,scaleY,rotation,opacity
  tilt?: { x: number; y: number; perspective?: number };  // degrees, ±60
  origin?: "top-left" | "center" | { x: number; y: number };
  clip?: DOMRect;
  decorative?: boolean;                    // inert content only
}
```

### 3.2 Internal modules

| Module | Responsibility |
|---|---|
| `errors.ts` | `FigmentUnsupportedError`, typed reasons |
| `support.ts` | structural checks (method presence + arity across 150/155/157) |
| `admission.ts` | functional probes: known-color pixel readback + `elementFromPoint` at transformed points; optional tilt proof |
| `canvas-setup.ts` | `content="drawable"`, `drawable` attrs, nested-canvas auto-mark/restore (crbug 576333009) |
| `paint.ts` | `paint`/`CanvasPaintEvent`, `requestPaint`, coalescing with rAF, `changedElements` dirty set, stale-layer tracking |
| `mutations.ts` | MutationObserver + same-value filter + side-effect attrs + input/focus capture queue + `data-figment-skip-capture` |
| `layers.ts` | registry, membership, complete-frame gating, budgets |
| `geometry.ts` | canonical affine/projective matrix → hits + draw + DOM; hit stack (`preserveHitTestOrder`); `clearElementGeometry` on retire |
| `tilt.ts` | projective matrix, corner-in-front-of-viewer check, frame-edge policy, admission witness |
| `units.ts` | CSS ↔ canvas grid ↔ device px; ResizeObserver + `devicePixelContentBoxSize` |
| `composite.ts` | backend draw (2D `drawElementImage` / WebGL `texElementSubImage2D` / WebGPU `drawElementImageToTexture`); transparent clear; bilinear premultiplied + analytic AA |
| `overlays.ts` | NativeOverlay-style portal host; NativeScroll invalidation |
| `diagnostics.ts` | `state()`: backend, health `idle\|pending\|healthy\|failed`, counters, metrics |
| `backend/2d.ts` `backend/webgl.ts` `backend/webgpu.ts` | thin adapters over browser API shapes |

### 3.3 Critical invariants

1. **One canonical matrix per layer** drives drawing, `updateElementGeometry`, and DOM (`matrix3d` when tilted). Never let them diverge.
2. **No incomplete frames** — membership changes wait for valid captures; keep last good output.
3. **Seamless first enable** — probe with `opacity:0; pointer-events:none`, swap only when complete.
4. **Never property-sniff** — functional probes decide admission.
5. **No fallback** — missing/failed capability ⇒ `FigmentUnsupportedError`, never placeholders.

---

## 4. `@figment/gpu` — effects, materials, motion

Owns visual treatment of live layers. Never clones DOM. Never owns hit-testing (delegates to host geometry).

### 4.1 Public API (target)

```ts
// effects (pixel-moving; decorative or inert-only content)
type EffectDesc =
  | { kind: "ripple";  amplitude: number; edge?: number }
  | { kind: "chromatic"; offset: number }
  | { kind: "dissolve";  progress: number }
  | { kind: "custom";  id: EffectId; params: Record<string, number> };

host.gpu.setEffect(layerId, EffectDesc | EffectDesc[]);  // max 3 chained
host.gpu.defineEffect(def: {
  id: string;
  wgsl: string;                          // frozen color-function schema
  params: { name: string; min: number; max: number }[];
});

// materials (persistent; safe on live controls — brightness factor only)
type MaterialDesc =
  | { kind: "relief"; bevel?: number; depth?: number }
  | { kind: "stage";  /* decorative ground */ }
  | { kind: "glass";  ior?: number; tint?: string; dispersion?: number };

host.gpu.setMaterial(layerId, MaterialDesc);

// lights
host.gpu.setEmitters(layerId, Emitter[]);      // lamps/LEDs/pointer light
// protected text rects: copy stays readable under light/glass

// motion
host.gpu.transition(layerId, MotionDesc): MotionHandle;
host.gpu.transitionGroup(items, staggerMs): MotionHandle[];
host.gpu.presence(el, { present: boolean; enter?: MotionDesc; exit?: MotionDesc });
```

### 4.2 Interaction contracts (safety)

| Mode | Content requirement | May move pixels? | May relight? |
|---|---|---|---|
| `decorative` | inert, `aria-hidden`, non-interactive | yes | yes |
| `inert` | interactive, but held `inert` during effect | yes (while inert) | yes |
| `material` | any, including live controls | **no** | yes |

Enforced at `setEffect`/`setMaterial` time and re-checked on mutation.

### 4.3 Internal modules

| Module | Responsibility |
|---|---|
| `effects/{ripple,chromatic,dissolve,custom}.ts` | bounded sampling ops |
| `effects/schema.ts` | `defineEffect` validation, compile-then-publish |
| `materials/{relief,stage,glass}.ts` | brightness-factor materials |
| `materials/{objects,instrument}.ts` | staged (M5+) |
| `emitters.ts` | lights, pointer light, protected rects |
| `motion/{transition,group,presence}.ts` | numeric keyframes, stagger, enter/exit |
| `composite.ts` | per-layer pass, shader budget (≤3 ops), AA |
| `glTF/` | staged ornament loading (M5+) |

---

## 5. `@figment/ui` — product surface

Web Components + CSS custom-property tokens. No framework required. Each component is real HTML semantics + optional material/effect presets.

### 5.1 Component inventory

| Cluster | Element | Notes |
|---|---|---|
| **Spatial shell** | `<figment-infinite-canvas>` | pan/zoom world, layer transform space |
| | `<figment-spatial-panel>` | movable/tiltable panel; relief/glass presets |
| | `<figment-layer-stack>` | z/depth ordering of panels |
| | `<figment-minimap>` | world overview |
| **Product chrome** | `<figment-command-palette>` | ⌘K; glass material preset |
| | `<figment-modal>` | focus trap, `inert` background |
| | `<figment-toast>` | dissolve enter/exit via `presence` |
| | `<figment-context-menu>` | |
| | `<figment-tooltip>` | 3D-aware positioning |
| **Data** | `<figment-virtual-list>` / `<figment-virtual-grid>` | windowed render (canvas perf) |
| **Forms** | `<figment-input>`, `<figment-select>`, `<figment-slider>`, `<figment-checkbox>` | native semantics preserved |
| **Game/HUD** | `<figment-hud>` | emitters, protected text |
| | `<figment-world-space-panel>` | panel in 3D scene space |

### 5.2 Tokens

CSS custom properties under `--figment-*`: color, radius, space, type scale, motion duration/easing, material defaults (glass tint, bevel depth). Works in DOM mode and canvas mode.

---

## 6. Framework integration

| Mode | Contract |
|---|---|
| **Universal** | `host.mount(el)` accepts any DOM. Framework keeps ownership of that tree. |
| **Web Components** | Kit works in every framework and in vanilla. |
| **Optional bindings** | `@figment/react` etc.: `useFigmentHost()`, `<FigmentLayer>`, portal helper — no reconciler, no custom renderer. |
| **Interop** | Real events, focus, forms, IME, screen readers unchanged. |

Bindings are deliberately thin: they resolve refs and call host APIs. If a binding is deleted, the app still runs on `@figment/host` + DOM.

---

## 7. Data flow

```
FE framework renders DOM
        │
        ▼
host.mount() ──► canvas setup (content=drawable, drawable attrs)
        │
        ├─► MutationObserver ── same-value filter ──► dirty layers
        ├─► input/focus events ───────────────────► dirty layers
        └─► browser paint event (changedElements) ► dirty layers
                │
                ▼
        paint frame (coalesced)
                │
                ├─► capture snapshots (native paint)
                ├─► gpu.composite (effects/materials/lights)
                ├─► backend draw (2D | WebGL | WebGPU)
                └─► updateElementGeometry (canonical matrix)
                        │
                        ▼
                hit-testing + a11y geometry stay correct
```

---

## 8. Error model

| Error | When | Behavior |
|---|---|---|
| `FigmentUnsupportedError("missing-api")` | HTML-in-Canvas absent / wrong shape | throw at `createHost` |
| `FigmentUnsupportedError("probe-failed")` | functional admission fails | throw at mount/enable |
| `FigmentUnsupportedError("tilt-unsupported")` | tilt hit-test probe fails | throw at `layer({tilt})`; flat layers still work |
| `EnrollmentError` | bad layer id, nested, duplicate, foreign element | throw at `layer()` |
| `PaintTimeoutError` | `paintOnce` deadline exceeded | reject; host stays healthy |

No silent degradation. No placeholders. Ever.

---

## 9. Testing strategy

| Layer | Approach |
|---|---|
| Unit | geometry math (affine/projective), units, mutation filter, motion descriptors — pure TS |
| Browser | Playwright + Chrome Canary + flags: paint, hit-test, nested canvas, input, tilt witnesses |
| Visual | golden screenshots of kit components (DPR 1 and 2) |
| A11y | keyboard traversal, focus rings, AT smoke (manual checklist + axe) |
| Interop | same demo mounted in React / Vue / Svelte / vanilla — pixel + hit parity |

---

## 10. Non-goals (v1)

- Fallbacks / polyfills / placeholders
- SSR / hydration
- Arbitrary CSS animation-library ownership (WAAPI adapters are M5+ optional)
- Engine bridges (Three/Babylon/Pixi) — separate adapters later if needed
- Shipping as a design-tool plugin
