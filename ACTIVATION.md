# HTML-in-Canvas — Activation & Shortcomings

**How to turn it on in Chrome, and what will bite you.**
Compiled 2026-10-26 from Google docs, WICG explainer/issues, and field reports (Underglass #187, CanvasUI, Prism).

---

## 1. Status snapshot

| Fact | Detail |
|---|---|
| Feature | HTML-in-Canvas (`content="drawable"`, `drawable`, `drawElementImage`, `paint` event, WebGPU/WebGL texture upload) |
| Shipped | **Chrome 157** stable path (docs: “shipped in Chrome 157”) |
| Experiment | **Origin Trial through Chrome 160** for refinements — [trial 3478467762190286849](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849) |
| Chrome status | https://chromestatus.com/feature/5172548013916160 |
| Spec / explainer | https://github.com/WICG/html-in-canvas |
| Other browsers | **Not supported** (Firefox/Safari). Community polyfills exist (SVG `foreignObject` approximations) — **figment does not use them** |

API names changed twice this year (Chrome 150 and 155). Always detect **method presence + arity**, not just property existence.

---

## 2. How to activate in Chrome

### 2.1 Chrome 157+ (stable) — recommended for most testing

The core API is in stable Chrome. For features still in Origin Trial (further refinements through 160):

1. Sign up for the trial and register your **origin** (e.g. `http://localhost:5173`):
   - https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849
2. Add the token meta tag on pages that need the trial features:
   ```html
   <meta
     http-equiv="origin-trial"
     content="PASTE_TOKEN_HERE">
   ```
3. Renew tokens before expiry (see [Origin Trials docs](https://developer.chrome.com/docs/web-platform/origin-trials#renew)).

No flags required for the shipped baseline in 157+.

### 2.2 Chrome Canary / Dev with flags (full experimental surface)

Use this when you need the newest OT behavior or to reproduce Chromium bugs.

**Option A — flags UI**

1. Install [Chrome Canary](https://www.google.com/chrome/canary/).
2. Open `chrome://flags/#canvas-draw-element` → **Enable**.
3. Open `chrome://flags/#enable-experimental-web-platform-features` → **Enable**.
4. Relaunch.

**Option B — command line** (CI, Playwright, repro scripts)

```bash
# macOS
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --enable-blink-features=CanvasDrawElement,ElementCanvasTransform \
  --enable-experimental-web-platform-features

# Linux
google-chrome-canary \
  --enable-blink-features=CanvasDrawElement,ElementCanvasTransform \
  --enable-experimental-web-platform-features
```

Blink feature names (from field reports):
- `CanvasDrawElement` — `drawElementImage`, `paint`, `content="drawable"`
- `ElementCanvasTransform` — `updateElementGeometry` / `getElementTransform` / `canvasClip`

### 2.3 Playwright / Puppeteer harness (figment M0c)

```ts
const context = await browser.newContext();
const page = await context.newPage();
// Chromium launch args:
//   --enable-blink-features=CanvasDrawElement,ElementCanvasTransform
//   --enable-experimental-web-platform-features
```

Must run **Chrome Canary channel** (or Chrome for Testing ≥ 157/158). Plain stable Chromium in Playwright may lag the OT surface.

### 2.4 Feature detection (structural — not sufficient alone)

```js
function supportsHtmlInCanvas() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("content", "drawable");
  return canvas.content === "drawable";
}
```

**figment requirement:** structural checks are a *precondition* only. Admission uses **functional probes** (pixel readback + `elementFromPoint`) before any GPU path, per Underglass’s findings. On failure: throw `FigmentUnsupportedError` — **no fallback**.

### 2.5 Quick smoke test

```html
<canvas id="c" width="400" height="200" content="drawable" style="width:400px">
  <form drawable>
    <label for="n">name:</label>
    <input id="n">
  </form>
</canvas>
<script>
  const canvas = document.getElementById("c");
  const form = canvas.querySelector("form");
  const ctx = canvas.getContext("2d");
  canvas.onpaint = () => {
    ctx.reset();
    ctx.drawElementImage(form, 20, 20);
  };
  new ResizeObserver(([e]) => {
    canvas.width = e.devicePixelContentBoxSize[0].inlineSize;
    canvas.height = e.devicePixelContentBoxSize[0].blockSize;
  }).observe(canvas, { box: "device-pixel-content-box" });
</script>
```

If the input is visible **inside** the canvas and you can type in it, the API is live.

---

## 3. Version / API churn (must-handle)

| Chrome | Change |
|---|---|
| **&lt; 150** | `texElementImage2D` (6-arg); loose `copyElementImageToTexture`; boolean `layoutsubtree` |
| **150** | Arg cleanup (WebGL drops `level/srcFormat/destType`); WebGPU dict params |
| **155** | `texElementImage2D` → **`texElementSubImage2D`** + explicit pre-allocation; `copyElementImageToTexture` → **`drawElementImageToTexture`**; `layoutsubtree` → **`content="drawable"`**; nested `drawable`; 2D `drawElementImage` returns **void** (auto geometry) |
| **157** | Stable ship path |
| **OT → 160** | Further refinements |

Cross-version snippets: [OT changes post](https://developer.chrome.com/blog/html-in-canvas-ot-changes).
figment plan: centralize this in `host/support.ts` (presence + arity + functional probe).

---

## 4. Shortcomings & gotchas

### 4.1 Confirmed bugs (workarounds required)

| Issue | Symptom | Workaround | Tracker |
|---|---|---|---|
| **Rotated `canvasClip` hit-test** | Paint clips to transformed rect; hit-test uses **axis-aligned bounding box** → wrong clicks on rotated clipped layers | Refuse GPU for rotated+clipped overflowing content until fixed | [WICG #186](https://github.com/WICG/html-in-canvas/issues/186) · crbug 573454036 |
| **Nested `<canvas>` captures blank** | Only the first attached child captures; later canvases / canvases after painted divs go blank | Set **`content="drawable"` on every nested canvas** while active (135/135 fixed in field tests); restore on teardown | crbug 576333009 · [WICG #184](https://github.com/WICG/html-in-canvas/issues/184) |
| **OffscreenCanvas commits fire no `paint`** | `transferControlToOffscreen()` redraws are invisible to `paint` observers (0 events) | Call `invalidate()` / `requestPaint()` explicitly after drawing | crbug 576333010 |
| **DPR 1 text ≠ on-screen** | Capture differs from DOM rasterization on some glyph pixels at DPR 1 (up to ~120 levels); identical at DPR 2 | Prefer DPR ≥ 2 for pixel-accurate export; treat as greyscale vs subpixel AA mismatch | WICG #187 finding 3 |

### 4.2 Spec / capability gaps (open)

| Gap | Impact on figment | Issue |
|---|---|---|
| No `removedElements` on `paint` | Must track DOM removal ourselves (mutation observer) | [#85](https://github.com/WICG/html-in-canvas/issues/85) |
| No built-in responsive canvas sizing | Manual `ResizeObserver` + `devicePixelContentBox` required | [#151](https://github.com/WICG/html-in-canvas/issues/151) |
| Imprecise hit testing | Coarse targets under complex transforms | [#148](https://github.com/WICG/html-in-canvas/issues/148) |
| Top-left only positioning | RTL / other corner origins awkward | [#146](https://github.com/WICG/html-in-canvas/issues/146) |
| `backdrop-filter` can’t use canvas as backdrop root | Glass UI must be custom shaders (our `glass` material) | [#79](https://github.com/WICG/html-in-canvas/issues/79) |
| Video controls/captions not painted | Media UI in layers will look empty | [#165](https://github.com/WICG/html-in-canvas/issues/165) |
| Cross-origin content omitted | iframes/images from other origins don’t render in snapshots | [#131](https://github.com/WICG/html-in-canvas/issues/131) |
| Ancestors of drawn elements “on-screen” semantics | Intersection / lifecycle edge cases | [#170](https://github.com/WICG/html-in-canvas/issues/170) |
| `<canvas>` required as host | Extra wrapper vs “just draw DOM” | [#126](https://github.com/WICG/html-in-canvas/issues/126) |

### 4.3 Security exclusions (by design — snapshots omit)

Read-back-allowed rendering **drops** from captures:

- Cross-origin embeds (`iframe`, `img`, CSS `url()`, tainted canvas, SVG refs)
- System colors / themes / forced colors markers
- Spelling & grammar markers
- Visited-link styling
- Form autofill highlights
- **Subpixel text anti-aliasing** (grayscale in snapshots)
- Video captions & controls
- IME popups / distinctive IME formatting

**Implication:** export/screenshot fidelity is *not* identical to what the user sees. Don’t promise pixel-perfect page captures.

### 4.4 Authoring footguns (easy to hit)

| Footgun | Detail | Mitigation |
|---|---|---|
| **Three coordinate systems** | CSS px ≠ canvas grid px ≠ device px. Mis-scaled draws look blurry or oversized | `ResizeObserver` + `device-pixel-content-box`; `scaleX = canvas.width / cssWidth` (see [concepts](https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts#sizing-and-units)) |
| **Setting `canvas.width/height` clears the bitmap** and resets 2D state (even to the same value) | Ghost frames / lost state | Resize once per RO callback; `requestPaint()` after |
| **`drawElementImage` draws the border box** | Padding/border can surprise layout size | `box-sizing: border-box` |
| **DOM changes inside `paint` land next frame** | Style writes in `paint` lag one frame | Mutate in `requestAnimationFrame` (runs *before* `paint`) for same-frame effect |
| **Nested `paint` order is reverse tree** | Parent composites stale child if order is wrong | Children first (browser already fires this way for nested canvases) |
| **Default hit stack = last drawn wins** | Background updates steal clicks | `preserveHitTestOrder: true` |
| **2D auto-geometry can be disabled** | `{ preserveElementGeometry: true }` leaves hits stale unless you call `updateElementGeometry` | Don’t disable unless you own geometry |
| **WebGL/WebGPU geometry is manual** | Forget `updateElementGeometry` → card turns but clicks stay at old place | figment host always syncs canonical matrix |
| **WebGL must pre-allocate texture** | `texElementSubImage2D` does not allocate; 155+ requires `texImage2D(..., null)` first | host/webgl backend handles |
| **`drawable` implies `isolation: isolate`** + containing block | Stacking / fixed-pos behavior changes | Treat layers as isolated surfaces |
| **Undrawn `drawable` lacks a11y geometry** | Screen readers see semantics; magnifiers may ignore | Draw or `updateElementGeometry` or `clearElementGeometry` intentionally |
| **OffscreenCanvas geometry is async batched** | `elementgeometryupdate` fires later | Don’t assume sync hits after worker draw |

### 4.5 Platform / product constraints

| Constraint | Detail |
|---|---|
| **Chrome-only** | No Safari/Firefox. figment: no fallback — `FigmentUnsupportedError` |
| **API churn** | Two breaking renames in 2026; OT through 160 |
| **Origin Trial overhead** | Tokens, renewals, origin registration for production-ish demos |
| **`contenteditable` / rich editors** | Field reports: some editing surfaces refuse GPU and must stay DOM (Underglass policy) |
| **IME / OS integration** | Not fully certified by anyone; treat as open |
| **Performance not free** | Capture + upload per changed layer; budgets needed (Underglass: 32 layers default, pixel cap) |
| **“Shipped” ≠ all platforms** | Docs say Chrome 157; verify Android/ChromeOS/WebView separately |

---

## 5. Testing matrix (figment M0c)

| Channel | Flags | Use |
|---|---|---|
| Chrome Canary ≥ 158 | Blink features + experimental | Primary CI + bug repro |
| Chrome stable ≥ 157 | none (baseline) | OT token path |
| Chrome Dev | same as Canary | Early warnings |

Always record: Chrome version, flags, DPR, and whether OT token was present.

---

## 6. References

| Source | Link |
|---|---|
| Chrome docs — overview | https://developer.chrome.com/docs/web-platform/html-in-canvas |
| Chrome docs — technical concepts (units, a11y) | https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts |
| Chrome docs — 2D / WebGL / WebGPU guides | `.../html-in-canvas/2d`, `/webgl`, `/webgpu` |
| OT changes (150/155) | https://developer.chrome.com/blog/html-in-canvas-ot-changes |
| Origin trial | https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849 |
| WICG explainer + IDL | https://github.com/WICG/html-in-canvas |
| Field report (bugs 1–3) | https://github.com/WICG/html-in-canvas/issues/187 |
| Community demos | https://github.com/GoogleChromeLabs/css-web-ui-demos/blob/main/html-in-canvas/awesome-html-in-canvas.md |
| CanvasUI (activation notes in install docs) | https://canvasui.dev/docs/installation |
| Underglass | https://github.com/RaananW/underglass |
| Prism | https://github.com/synthesiseng/prism |

---

## 7. figment takeaways (plan hooks)

| Shortcoming | Plan task |
|---|---|
| Nested canvas blank | **M1c** auto-mark `content="drawable"` |
| OffscreenCanvas stale | **M1e** explicit invalidate hooks |
| Mutation/`paint` gaps | **M1e** mutation filter + input captures |
| Unit blur | **M1f** units module |
| Rotated clip hit-test | **M2d/M2g** refuse mode + probes |
| API arity churn | **M1a** support detect (presence + arity) |
| Probe vs sniff | **M2a/M2b** functional admission |
| DPR 1 text mismatch | Prefer DPR 2 for export (**M5d**) |
| Security omissions | Documented in export API (**M5d**) — no pixel-perfect page claim |

---

*Re-verify flags and OT token before each milestone demo — this surface is still moving.*
