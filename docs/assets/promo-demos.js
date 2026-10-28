class x extends Error {
  reason;
  name = "FigmentUnsupportedError";
  constructor(t, n) {
    super(`figment: ${t}: ${n}`), this.reason = t;
  }
}
class k extends Error {
  name = "EnrollmentError";
  constructor(t) {
    super(`figment: ${t}`);
  }
}
class nt extends Error {
  name = "PaintTimeoutError";
  constructor(t) {
    super(`figment: ${t}`);
  }
}
function Lt(e) {
  return typeof e == "function" ? e.length : null;
}
function Ft(e) {
  const t = [], n = {};
  e.setAttribute("content", "drawable");
  const i = e.content;
  n.content = i, i !== "drawable" && t.push("HTMLCanvasElement.content (reflects 'drawable')");
  const r = document.createElement("canvas");
  r.width = 2, r.height = 2;
  const s = r.getContext("2d");
  if (!s)
    t.push("CanvasRenderingContext2D");
  else {
    const a = s.drawElementImage;
    n.drawElementImage = typeof a == "function" ? Lt(a) : null, typeof a != "function" && t.push("CanvasRenderingContext2D.drawElementImage");
  }
  const o = e;
  return n.requestPaint = typeof o.requestPaint == "function", n.requestPaint || t.push("HTMLCanvasElement.requestPaint"), n.updateElementGeometry = typeof o.updateElementGeometry == "function", { ok: t.length === 0, missing: t, details: n };
}
function Dt(e) {
  const t = Ft(e);
  if (!t.ok)
    throw new x(
      "missing-api",
      `HTML-in-Canvas unavailable. Missing: ${t.missing.join(", ")}. See ACTIVATION.md for Chrome Canary flags / Origin Trial.`
    );
  return t;
}
function it(e, t) {
  const n = "width" in e ? e.width : e.x, i = "height" in e ? e.height : e.y, r = "width" in t ? t.width : t.x, s = "height" in t ? t.height : t.y;
  return {
    x: r === 0 ? 1 : n / r,
    y: s === 0 ? 1 : i / s
  };
}
const kt = {
  x: 0,
  y: 0,
  z: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  rotateX: 0,
  rotateY: 0,
  opacity: 1
}, It = /* @__PURE__ */ new Set([
  "src",
  "srcset",
  "srcdoc",
  "href",
  "poster",
  // canvas bitmap clears on every width/height set, even to the same value
  "width",
  "height"
]);
function Ot(e) {
  if (e.type === "attributes") {
    const t = e.attributeName;
    if (!t || It.has(t)) return !1;
    const i = e.target.getAttributeNS(e.attributeNamespace, t);
    return e.oldValue === i;
  }
  if (e.type === "characterData") {
    const t = e.target;
    return e.oldValue === t.data;
  }
  return !1;
}
function Gt(e, t) {
  const n = { ignored: 0, queued: 0 }, i = new MutationObserver((r) => {
    for (const s of r) {
      if (Ot(s)) {
        n.ignored += 1;
        continue;
      }
      n.queued += 1, t(s.target);
    }
  });
  return i.observe(e, {
    subtree: !0,
    childList: !0,
    attributes: !0,
    characterData: !0,
    attributeOldValue: !0,
    characterDataOldValue: !0
  }), {
    observer: i,
    stats: n,
    stop() {
      i.disconnect();
    }
  };
}
function Bt(e, t, n) {
  const i = (s) => {
    const o = s.target;
    o && (o instanceof Element && o.hasAttribute("data-figment-skip-capture") || (n.inputCaptures += 1, t(o)));
  }, r = ["input", "focusin", "focusout"];
  for (const s of r)
    e.addEventListener(s, i, !0);
  return () => {
    for (const s of r)
      e.removeEventListener(s, i, !0);
  };
}
const O = "#c23f53";
function Ut(e) {
  const t = e.replace("#", "").trim(), n = t.length === 3 ? t.split("").map((i) => i + i).join("") : t;
  if (!/^[0-9a-fA-F]{6}$/.test(n))
    throw new Error(`parseHexColor: not a hex color: ${e}`);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
    a: 255
  };
}
function Ht(e, t, n = 12) {
  return Math.abs(e.r - t.r) <= n && Math.abs(e.g - t.g) <= n && Math.abs(e.b - t.b) <= n && t.a >= 200;
}
function Xt(e, t, n, i) {
  return new Promise((r) => {
    const s = e.getContext("2d");
    if (!s) {
      r({ ok: !1, detail: "pixel probe: 2d context unavailable" });
      return;
    }
    const o = s, a = setTimeout(() => {
      e.removeEventListener("paint", c), r({
        ok: !1,
        detail: `pixel probe: paint event timed out after ${i}ms`
      });
    }, i);
    function c() {
      clearTimeout(a), e.removeEventListener("paint", c);
      try {
        o.reset(), o.drawElementImage(t, 20, 20);
        const { data: f } = o.getImageData(n.x, n.y, 1, 1);
        r({ ok: !0, data: f });
      } catch (f) {
        r({
          ok: !1,
          detail: f instanceof Error ? f.message : String(f)
        });
      }
    }
    e.addEventListener("paint", c), e.requestPaint();
  });
}
async function yt(e = {}) {
  const t = e.timeoutMs ?? 2e3, n = e.tolerance ?? 12, i = performance.now(), r = Ut(O), s = { x: 80, y: 40 }, o = document.createElement("div");
  o.setAttribute("data-figment-probe", "1"), o.style.cssText = "width:200px;height:120px;overflow:hidden;position:absolute;left:0;top:0;z-index:-1;";
  const a = document.createElement("canvas");
  a.width = 200, a.height = 120, a.style.cssText = "width:200px;height:120px;background:#eee;", a.setAttribute("content", "drawable"), o.append(a);
  const c = document.createElement("div");
  c.setAttribute("drawable", ""), c.style.cssText = `width:120px;height:40px;background:${O};color:#fff;font:14px system-ui;padding:8px;box-sizing:border-box;`, c.textContent = "figment", a.append(c), document.body.append(o);
  const f = (l) => ({
    ...l,
    durationMs: Math.round(performance.now() - i)
  });
  try {
    const l = await Xt(a, c, s, t);
    if (!l.ok)
      return f({
        ok: !1,
        expectedHex: O,
        expected: r,
        actual: null,
        sample: s,
        detail: l.detail
      });
    const p = l.data, u = {
      r: p[0] ?? 0,
      g: p[1] ?? 0,
      b: p[2] ?? 0,
      a: p[3] ?? 0
    }, d = Ht(r, u, n);
    return f({
      ok: d,
      expectedHex: O,
      expected: r,
      actual: u,
      sample: s,
      detail: d ? `pixel probe ok: read ${B(u)} matched ${B(r)} (±${n})` : `pixel probe failed: expected ${B(r)} at (${s.x},${s.y}), read ${B(u)} (±${n})`
    });
  } catch (l) {
    return f({
      ok: !1,
      expectedHex: O,
      expected: r,
      actual: null,
      sample: s,
      detail: l instanceof Error ? l.message : String(l)
    });
  } finally {
    o.remove();
  }
}
function B(e) {
  return `rgba(${e.r},${e.g},${e.b},${e.a})`;
}
const U = "figment-hit-probe-target";
async function Nt(e = {}) {
  const t = performance.now(), n = e.transform ?? "translate(48px, 32px) rotate(8deg) skewX(-4deg)";
  e.timeoutMs;
  const i = document.createElement("div");
  i.setAttribute("data-figment-hit-probe", "1"), i.style.cssText = "position:fixed;left:16px;top:16px;width:240px;height:160px;z-index:2147483000;pointer-events:none;";
  const r = document.createElement("div");
  r.id = U, r.style.cssText = [
    "position:absolute",
    "left:20px",
    "top:20px",
    "width:80px",
    "height:40px",
    `transform:${n}`,
    "transform-origin:top left",
    "background:#1b2230",
    "pointer-events:auto"
  ].join(";"), i.append(r), document.body.append(i);
  const s = (o) => ({
    ...o,
    durationMs: Math.round(performance.now() - t)
  });
  try {
    await new Promise((u) => {
      const d = setTimeout(u, 0);
      requestAnimationFrame(() => {
        clearTimeout(d), u();
      });
    });
    const o = r.getBoundingClientRect();
    if (o.width < 1 || o.height < 1)
      return s({
        ok: !1,
        transform: n,
        samples: [],
        detail: `hit probe: target has empty box (${o.width}×${o.height})`
      });
    const a = [
      { label: "center", lx: 40, ly: 20 },
      { label: "local-tl", lx: 10, ly: 8 },
      { label: "local-tr", lx: 70, ly: 8 },
      { label: "local-bl", lx: 10, ly: 32 },
      { label: "local-br", lx: 70, ly: 32 }
    ], c = [
      { label: "miss-left", x: o.left - 24, y: o.top + o.height / 2 },
      { label: "miss-right", x: o.right + 24, y: o.top + o.height / 2 },
      {
        label: "miss-far",
        x: o.right + 120,
        y: o.bottom + 120
      }
    ], f = [];
    for (const u of a) {
      const d = zt(r, u.lx, u.ly), h = document.elementFromPoint(d.x, d.y), m = h && (h.id || h.getAttribute("data-testid")) || (h?.tagName.toLowerCase() ?? null), g = !!h && (h === r || r.contains(h));
      f.push({
        label: u.label,
        client: d,
        expectedId: U,
        actualId: g ? U : m,
        matched: g
      });
    }
    for (const u of c) {
      const d = document.elementFromPoint(u.x, u.y), h = !!d && (d === r || r.contains(d));
      f.push({
        label: u.label,
        client: { x: u.x, y: u.y },
        expectedId: null,
        actualId: h ? U : d?.id || d?.tagName.toLowerCase() || null,
        matched: !h
      });
    }
    const l = f.every((u) => u.matched), p = f.filter((u) => !u.matched);
    return s({
      ok: l,
      transform: n,
      samples: f,
      detail: l ? `hit probe ok: ${f.length} points matched under transform (${n})` : `hit probe failed at ${p.map((u) => `${u.label}→${u.actualId}`).join(", ")} under transform (${n})`
    });
  } catch (o) {
    return s({
      ok: !1,
      transform: n,
      samples: [],
      detail: o instanceof Error ? o.message : String(o)
    });
  } finally {
    i.remove();
  }
}
function zt(e, t, n) {
  const i = document.createElement("i");
  i.setAttribute("data-figment-hit-marker", "1"), i.style.cssText = `position:absolute;left:${t}px;top:${n}px;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none;`, e.append(i);
  try {
    const r = i.getBoundingClientRect();
    return { x: r.left, y: r.top };
  } finally {
    i.remove();
  }
}
async function Yt(e = {}) {
  const t = await yt(e.pixel), n = await Nt(e.hit);
  return { pixel: t, hit: n };
}
async function qt(e = {}) {
  const t = await Yt(e);
  if (!t.pixel.ok)
    throw new x(
      "probe-failed",
      `${t.pixel.detail}. See ACTIVATION.md (Chrome 157+ / Canary flags).`
    );
  if (!t.hit.ok)
    throw new x(
      "probe-failed",
      `${t.hit.detail}. See ACTIVATION.md (Chrome 157+ / Canary flags).`
    );
  return t;
}
function Vt(e) {
  e.setAttribute("content", "drawable");
}
function rt(e) {
  const t = [];
  for (const n of e.querySelectorAll("canvas")) {
    const i = n;
    if (i.hasAttribute("content") && i.getAttribute("content") === "drawable" && i.dataset.figmentHost === "1")
      continue;
    const r = i.getAttribute("content");
    i.setAttribute("content", "drawable"), t.push({ canvas: i, previous: r });
  }
  return t;
}
function K(e) {
  for (const t of e)
    t.canvas.isConnected && (t.previous === null ? t.canvas.removeAttribute("content") : t.canvas.setAttribute("content", t.previous));
}
function Wt(e) {
  e.hasAttribute("drawable") || (e.setAttribute("drawable", ""), e.setAttribute("data-figment-drawable", "1"));
}
function st(e) {
  e.getAttribute("data-figment-drawable") === "1" && (e.removeAttribute("drawable"), e.removeAttribute("data-figment-drawable"));
}
function jt(e, t) {
  const n = () => ({
    x: e.clientWidth || e.getBoundingClientRect().width,
    y: e.clientHeight || e.getBoundingClientRect().height
  });
  let i = {
    canvasGrid: { x: e.width, y: e.height },
    cssSize: n(),
    scale: { x: 1, y: 1 }
  };
  i.scale = it(i.canvasGrid, i.cssSize);
  const r = (a, c) => {
    e.width !== Math.round(a.x) && (e.width = Math.round(a.x)), e.height !== Math.round(a.y) && (e.height = Math.round(a.y)), i = {
      canvasGrid: { x: e.width, y: e.height },
      cssSize: c,
      scale: it({ x: e.width, y: e.height }, c)
    }, t(i);
  }, s = typeof ResizeObserverEntry < "u" && "devicePixelContentBoxSize" in ResizeObserverEntry.prototype, o = new ResizeObserver((a) => {
    const c = a[0];
    if (!c) return;
    const f = s ? c.devicePixelContentBoxSize?.[0] : void 0, l = {
      x: c.contentRect.width,
      y: c.contentRect.height
    }, p = f ? { x: f.inlineSize, y: f.blockSize } : {
      x: Math.round(l.x * window.devicePixelRatio),
      y: Math.round(l.y * window.devicePixelRatio)
    };
    r(p, l);
  });
  return o.observe(
    e,
    s ? { box: "device-pixel-content-box" } : {}
  ), {
    state: () => i,
    stop() {
      o.disconnect();
    }
  };
}
function vt(e, t) {
  return e === "top-left" ? { x: 0, y: 0 } : e === "center" ? { x: t.x / 2, y: t.y / 2 } : { x: e.x * t.x, y: e.y * t.y };
}
class Kt {
  map = /* @__PURE__ */ new Map();
  seq = 0;
  budget;
  constructor(t = 32) {
    this.budget = t;
  }
  get size() {
    return this.map.size;
  }
  add(t, n = {}) {
    if (this.map.size >= this.budget)
      throw new k(
        `layer budget exceeded (${this.budget}). Increase budgets.layers.`
      );
    if (this.findByElement(t))
      throw new k("element already enrolled as a layer");
    const i = n.id ?? `layer-${++this.seq}`;
    if (this.map.has(i))
      throw new k(`duplicate layer id "${i}"`);
    const r = {
      id: i,
      element: t,
      transform: { ...kt, ...n.transform },
      origin: n.origin ?? "top-left",
      decorative: n.decorative ?? !1,
      dirty: !0,
      preserveHitTestOrder: n.preserveHitTestOrder ?? !0,
      nestedMarks: []
    };
    return n.clip && (r.clip = n.clip), n.drawAt && (r.drawAt = n.drawAt), n.tilt && (r.tilt = n.tilt), this.map.set(i, r), r;
  }
  get(t) {
    return this.map.get(t);
  }
  findByElement(t) {
    for (const n of this.map.values())
      if (n.element === t || n.element.contains(t) || t.contains(n.element))
        return n;
  }
  findForTarget(t) {
    const n = t instanceof Element ? t : t.parentElement ?? t.parentNode;
    if (n)
      return this.findByElement(n) ?? (n.closest?.("[data-figment-layer]"), void 0);
  }
  all() {
    return [...this.map.values()];
  }
  /** Layers topmost-first for hit resolution. */
  hitStack() {
    return this.all().reverse();
  }
  dirtyAll() {
    return this.all().filter((t) => t.dirty);
  }
  markAllDirty() {
    for (const t of this.map.values()) t.dirty = !0;
  }
  remove(t) {
    const n = this.map.get(t);
    return n && this.map.delete(t), n;
  }
  clear() {
    this.map.clear();
  }
}
function Zt() {
  return {
    paints: 0,
    layersDrawn: 0,
    dirtyRedraws: 0,
    mutationsIgnored: 0,
    inputCaptures: 0,
    nestedCanvasMarks: 0,
    skippedFrames: 0,
    seamlessSwaps: 0,
    geometryUpdates: 0,
    geometryClears: 0,
    tiltWitnesses: 0,
    tiltWitnessFailures: 0
  };
}
function Jt(e) {
  const t = {
    backend: e.backend,
    health: e.health,
    supported: e.supported,
    pendingEnable: e.pendingEnable,
    canvasGrid: e.canvasGrid,
    cssSize: e.cssSize,
    unitScale: e.unitScale,
    layers: e.layers,
    admission: e.admission,
    metrics: { ...e.metrics }
  };
  return e.lastError !== void 0 && (t.lastError = e.lastError), t;
}
const ot = 1200;
function Qt() {
  return {
    z: 0,
    perspective: ot,
    /** Minimum distance from camera (px). */
    near: 1,
    /** Maximum distance from camera (px). */
    far: ot * 4
  };
}
function te(e) {
  return e.near ?? 1;
}
function ee(e) {
  return e.far ?? e.perspective * 4;
}
function ne(e, t) {
  return t - e;
}
function bt(e, t) {
  return e - t.z;
}
function et(e, t) {
  const n = t - e;
  return n <= 0 ? null : t / n;
}
function wt(e, t) {
  const n = ne(e, t.perspective);
  return n <= 0 ? "behind-camera" : n < te(t) ? "near" : n > ee(t) ? "far" : "front";
}
function ie(e) {
  const t = e.perspective ?? 1200, n = e.cameraZ ?? 0, i = e.z - n, r = et(i, t) ?? 1, s = (e.scaleX ?? 1) * r, o = (e.scaleY ?? 1) * r, a = e.rotation ?? 0, c = e.rotateX ?? 0, f = e.rotateY ?? 0, l = [];
  return a !== 0 && l.push(`rotate(${a}deg)`), c !== 0 && l.push(`rotateX(${c}deg)`), f !== 0 && l.push(`rotateY(${f}deg)`), (s !== 1 || o !== 1) && l.push(`scale(${s}, ${o})`), (e.x !== 0 || e.y !== 0 || e.z !== 0) && l.push(`translate(${e.x}px, ${e.y}px)`), l.length ? l.join(" ") : "none";
}
function re(e) {
  const { ctx: t, layers: n, cssSize: i, unitScale: r, camera: s } = e;
  let o = 0;
  t.imageSmoothingEnabled = !0, t.imageSmoothingQuality = "high", t.globalCompositeOperation = "source-over";
  const a = s.origin ?? {
    x: i.x / 2,
    y: i.y / 2
  };
  for (const c of n) {
    const f = bt(c.transform.z, s);
    if (wt(f, s) !== "front") {
      c.dirty = !1;
      continue;
    }
    const l = c.element;
    if (!(l instanceof HTMLElement) && !(l instanceof SVGElement))
      continue;
    const p = l.getBoundingClientRect(), u = p.width || l.clientWidth, d = p.height || l.clientHeight, h = u * r.x, m = d * r.y, g = c.drawAt ? c.drawAt.x : (c.transform.x + (p.left - se())) * r.x, v = c.drawAt ? c.drawAt.y : (c.transform.y + (p.top - oe())) * r.y;
    if (t.save(), c.transform.opacity !== 1 && (t.globalAlpha = Math.min(1, Math.max(0, c.transform.opacity))), c.clip) {
      const T = r.x, S = r.y;
      t.beginPath(), t.rect(c.clip.x * T, c.clip.y * S, c.clip.width * T, c.clip.height * S), t.clip();
    }
    const y = c.transform.rotation !== 0 || c.transform.scaleX !== 1 || c.transform.scaleY !== 1, w = et(f, s.perspective) ?? 1, E = Math.abs(w - 1) > 1e-6;
    if (y || E) {
      const T = vt(c.origin, { x: h, y: m }), S = g + T.x, b = v + T.y;
      t.translate(a.x * r.x, a.y * r.y), t.scale(w, w), t.translate(-a.x * r.x, -a.y * r.y), t.translate(S, b), t.rotate(c.transform.rotation * Math.PI / 180), t.scale(c.transform.scaleX, c.transform.scaleY), t.translate(-S, -b);
    }
    t.drawElementImage(l, g, v), t.restore(), c.dirty = !1, o += 1;
  }
  return o;
}
function se(e) {
  return 0;
}
function oe(e) {
  return 0;
}
function Et(e) {
  const { layers: t, cssSize: n, unitScale: i, camera: r, onlyDirty: s } = e, o = r.origin ?? { x: n.x / 2, y: n.y / 2 }, a = o.x * i.x, c = o.y * i.y, f = [];
  for (const l of t) {
    if (s && !l.dirty) continue;
    const p = bt(l.transform.z, r);
    if (wt(p, r) !== "front") {
      l.dirty = !1;
      continue;
    }
    const u = l.element;
    if (!(u instanceof HTMLElement) && !(u instanceof SVGElement)) continue;
    const d = u.getBoundingClientRect(), h = d.width || u.clientWidth, m = d.height || u.clientHeight, g = h * i.x, v = m * i.y, y = l.drawAt ? l.drawAt.x : l.transform.x * i.x, w = l.drawAt ? l.drawAt.y : l.transform.y * i.y, E = et(p, r.perspective) ?? 1, T = vt(l.origin, { x: g, y: v });
    f.push({
      id: l.id,
      element: u,
      x: y,
      y: w,
      width: g,
      height: v,
      zs: E,
      rotationDeg: l.transform.rotation,
      scaleX: l.transform.scaleX,
      scaleY: l.transform.scaleY,
      opacity: l.transform.opacity,
      pivotX: y + T.x,
      pivotY: w + T.y,
      originX: a,
      originY: c,
      ...l.clip ? {
        clip: {
          x: l.clip.x * i.x,
          y: l.clip.y * i.y,
          width: l.clip.width * i.x,
          height: l.clip.height * i.y
        }
      } : {}
    }), l.dirty = !1;
  }
  return f;
}
const Tt = 1.25, ae = `
float figmentEdgeAA(vec2 uv, vec2 texel) {
  // Distance to the nearest UV edge in texels (quad border).
  vec2 d = min(uv, vec2(1.0) - uv) / max(texel, vec2(1e-6));
  float dist = min(d.x, d.y);
  float w = ${Tt.toFixed(2)};
  return smoothstep(0.0, w, dist);
}

vec4 figmentSamplePremul(sampler2D tex, vec2 uv, vec2 texel, float alpha) {
  vec4 c = texture2D(tex, uv);
  // Textures are uploaded premultiplied; filter stays linear (bilinear premul).
  float aa = figmentEdgeAA(uv, texel);
  return vec4(c.rgb * alpha * aa, c.a * alpha * aa);
}
`, ce = `
fn figmentEdgeAA(uv: vec2f, texel: vec2f) -> f32 {
  let d = min(uv, vec2f(1.0, 1.0) - uv) / max(texel, vec2f(1e-6, 1e-6));
  let dist = min(d.x, d.y);
  return smoothstep(0.0, ${Tt.toFixed(2)}, dist);
}

fn figmentSamplePremul(tex: texture_2d<f32>, samp: sampler, uv: vec2f, texel: vec2f, alpha: f32) -> vec4f {
  let c = textureSample(tex, samp, uv);
  let aa = figmentEdgeAA(uv, texel);
  return vec4f(c.rgb * alpha * aa, c.a * alpha * aa);
}
`, le = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform mat3 u_matrix;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
  vec3 clip = u_matrix * vec3(a_pos, 1.0);
  vec2 zeroToOne = clip.xy / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  v_uv = a_uv;
}`, ue = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
uniform vec2 u_texel;
${ae}
void main() {
  gl_FragColor = figmentSamplePremul(u_tex, v_uv, u_texel, u_alpha);
}`;
function at(e, t, n) {
  const i = e.createShader(t);
  if (!i) throw new x("missing-api", "WebGL createShader failed");
  if (e.shaderSource(i, n), e.compileShader(i), !e.getShaderParameter(i, e.COMPILE_STATUS)) {
    const r = e.getShaderInfoLog(i) ?? "compile error";
    throw e.deleteShader(i), new x("missing-api", `WebGL shader: ${r}`);
  }
  return i;
}
function fe(e, t, n) {
  const i = Math.cos(e.rotationDeg * Math.PI / 180), r = Math.sin(e.rotationDeg * Math.PI / 180), s = e.scaleX, o = e.scaleY;
  let a = i * s, c = r * s, f = -r * o, l = i * o, p = e.pivotX - (a * e.pivotX + f * e.pivotY) + e.x, u = e.pivotY - (c * e.pivotX + l * e.pivotY) + e.y;
  const d = e.zs, h = d, m = d, g = e.originX * (1 - d), v = e.originY * (1 - d), y = h * a, w = h * c, E = m * f, T = m * l, S = h * p + g, b = m * u + v;
  return [y, w, 0, E, T, 0, S, b, 1];
}
function de(e) {
  const t = e.getContext("webgl", {
    alpha: !0,
    premultipliedAlpha: !0,
    antialias: !0,
    // M5d: PNG export needs the last frame readable after draw.
    preserveDrawingBuffer: !0
  });
  if (!t)
    throw new x("missing-api", "WebGL context unavailable");
  const n = t;
  if (typeof n.texElementSubImage2D != "function")
    throw new x(
      "missing-api",
      "WebGL texElementSubImage2D missing (Chrome 155+ HTML-in-Canvas)"
    );
  const r = at(n, n.VERTEX_SHADER, le), s = at(n, n.FRAGMENT_SHADER, ue), o = n.createProgram();
  if (!o) throw new x("missing-api", "WebGL createProgram failed");
  if (n.attachShader(o, r), n.attachShader(o, s), n.linkProgram(o), !n.getProgramParameter(o, n.LINK_STATUS))
    throw new x(
      "missing-api",
      `WebGL link: ${n.getProgramInfoLog(o) ?? "failed"}`
    );
  const a = n.createBuffer();
  n.bindBuffer(n.ARRAY_BUFFER, a), n.bufferData(n.ARRAY_BUFFER, new Float32Array(24), n.DYNAMIC_DRAW);
  const c = n.getAttribLocation(o, "a_pos"), f = n.getAttribLocation(o, "a_uv"), l = n.getUniformLocation(o, "u_matrix"), p = n.getUniformLocation(o, "u_resolution"), u = n.getUniformLocation(o, "u_tex"), d = n.getUniformLocation(o, "u_alpha"), h = n.getUniformLocation(o, "u_texel"), m = /* @__PURE__ */ new Map();
  function g(v) {
    const y = Math.max(1, Math.ceil(v.element.getBoundingClientRect().width)), w = Math.max(1, Math.ceil(v.element.getBoundingClientRect().height));
    let E = m.get(v.id);
    if (!E || E.width !== y || E.height !== w) {
      E && n.deleteTexture(E.texture);
      const T = n.createTexture();
      if (!T) throw new x("missing-api", "WebGL createTexture failed");
      n.bindTexture(n.TEXTURE_2D, T), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE), n.texImage2D(
        n.TEXTURE_2D,
        0,
        n.RGBA,
        y,
        w,
        0,
        n.RGBA,
        n.UNSIGNED_BYTE,
        null
      ), E = { texture: T, width: y, height: w }, m.set(v.id, E);
    }
    return E;
  }
  return {
    kind: "webgl",
    draw(v, y) {
      const w = window.devicePixelRatio || 1, E = y.cssSize.x, T = y.cssSize.y, S = E * y.unitScale.x * w, b = T * y.unitScale.y * w;
      e.width = Math.max(1, Math.round(S)), e.height = Math.max(1, Math.round(b)), n.viewport(0, 0, e.width, e.height), n.clearColor(0, 0, 0, 0), n.clear(n.COLOR_BUFFER_BIT), n.enable(n.BLEND), n.blendFunc(n.ONE, n.ONE_MINUS_SRC_ALPHA);
      const R = Et({
        ...y,
        layers: v,
        onlyDirty: !1
      });
      n.useProgram(o), n.bindBuffer(n.ARRAY_BUFFER, a), n.enableVertexAttribArray(c), n.enableVertexAttribArray(f), n.vertexAttribPointer(c, 2, n.FLOAT, !1, 16, 0), n.vertexAttribPointer(f, 2, n.FLOAT, !1, 16, 8), n.uniform2f(p, e.width, e.height);
      for (const A of R) {
        const M = g(A);
        n.bindTexture(n.TEXTURE_2D, M.texture), n.texElementSubImage2D(n.TEXTURE_2D, 0, 0, 0, A.element, {
          premultiplyAlpha: "premultiply",
          colorSpaceConversion: "none"
        });
        const P = A.x, _ = A.y, $ = A.x + A.width, L = A.y + A.height, F = new Float32Array([
          P,
          _,
          0,
          0,
          $,
          _,
          1,
          0,
          P,
          L,
          0,
          1,
          P,
          L,
          0,
          1,
          $,
          _,
          1,
          0,
          $,
          L,
          1,
          1
        ]);
        n.bufferSubData(n.ARRAY_BUFFER, 0, F), n.uniformMatrix3fv(l, !1, fe(A, e.width, e.height)), n.uniform1f(d, A.opacity), n.uniform2f(h, 1 / M.width, 1 / M.height), n.activeTexture(n.TEXTURE0), n.uniform1i(u, 0), n.drawArrays(n.TRIANGLES, 0, 6);
      }
      return R.length;
    },
    dispose() {
      for (const v of m.values()) n.deleteTexture(v.texture);
      m.clear(), n.deleteBuffer(a), n.deleteProgram(o), n.deleteShader(r), n.deleteShader(s);
    }
  };
}
const H = {
  VERTEX: 32,
  COPY_DST: 8,
  UNIFORM: 64
}, Z = {
  TEXTURE_BINDING: 4,
  COPY_DST: 2,
  RENDER_ATTACHMENT: 16
}, he = `
struct Uniforms {
  matrix: mat4x4f,
  alpha: f32,
  _pad: vec3f,
};
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@location(0) pos: vec2f, @location(1) uv: vec2f) -> VSOut {
  var out: VSOut;
  out.pos = u.matrix * vec4f(pos, 0.0, 1.0);
  out.uv = uv;
  return out;
}

${ce}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let dims = vec2f(textureDimensions(tex));
  return figmentSamplePremul(tex, samp, in.uv, vec2f(1.0) / dims, u.alpha);
}
`;
function me(e, t, n) {
  const i = Math.cos(e.rotationDeg * Math.PI / 180), r = Math.sin(e.rotationDeg * Math.PI / 180), s = e.scaleX, o = e.scaleY, a = i * s, c = r * s, f = -r * o, l = i * o, p = e.pivotX - (a * e.pivotX + f * e.pivotY) + e.x, u = e.pivotY - (c * e.pivotX + l * e.pivotY) + e.y, d = e.zs, h = d * a, m = d * c, g = d * f, v = d * l, y = d * p + e.originX * (1 - d), w = d * u + e.originY * (1 - d), E = t, T = n, S = 2 * h / E, b = 2 * m / E, R = 2 * y / E - 1, A = -2 * g / T, M = -2 * v / T, P = 1 - 2 * w / T;
  return new Float32Array([
    S,
    b,
    0,
    0,
    A,
    M,
    0,
    0,
    0,
    0,
    1,
    0,
    R,
    P,
    0,
    1
  ]);
}
async function ge(e) {
  const t = e, n = globalThis.navigator?.gpu;
  if (!n)
    throw new x("missing-api", "navigator.gpu unavailable");
  const i = await n.requestAdapter();
  if (!i)
    throw new x("missing-api", "WebGPU adapter unavailable");
  const r = await i.requestDevice(), s = t.getContext("webgpu");
  if (!s)
    throw new x("missing-api", "GPUCanvasContext unavailable");
  const o = n.getPreferredCanvasFormat();
  s.configure({ device: r, format: o, alphaMode: "premultiplied" });
  const a = r.createShaderModule({ code: he }), c = r.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: a,
      entryPoint: "vs",
      buffers: [
        {
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 8, format: "float32x2" }
          ]
        }
      ]
    },
    fragment: {
      module: a,
      entryPoint: "fs",
      targets: [
        {
          format: o,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
          }
        }
      ]
    },
    primitive: { topology: "triangle-list" }
  }), f = r.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge"
  }), l = r.createBuffer({
    size: 96,
    usage: H.VERTEX | H.COPY_DST
  }), p = r.createBuffer({
    size: 80,
    usage: H.UNIFORM | H.COPY_DST
  }), u = /* @__PURE__ */ new Map();
  if (typeof r.queue.drawElementImageToTexture != "function")
    throw new x(
      "missing-api",
      "GPUQueue.drawElementImageToTexture missing (Chrome 155+ HTML-in-Canvas)"
    );
  function h(m) {
    const g = Math.max(1, Math.ceil(m.element.getBoundingClientRect().width)), v = Math.max(1, Math.ceil(m.element.getBoundingClientRect().height));
    let y = u.get(m.id);
    if (!y || y.width !== g || y.height !== v) {
      y?.texture.destroy();
      const w = r.createTexture({
        size: [g, v],
        format: "rgba8unorm",
        usage: Z.TEXTURE_BINDING | Z.COPY_DST | Z.RENDER_ATTACHMENT
      });
      y = { texture: w, width: g, height: v, view: w.createView() }, u.set(m.id, y);
    }
    return y;
  }
  return {
    kind: "webgpu",
    draw(m, g) {
      const v = window.devicePixelRatio || 1, y = Math.max(
        1,
        Math.round(g.cssSize.x * g.unitScale.x * v)
      ), w = Math.max(
        1,
        Math.round(g.cssSize.y * g.unitScale.y * v)
      );
      e.width = y, e.height = w;
      const E = Et({
        ...g,
        layers: m,
        onlyDirty: !1
      });
      for (const b of E) {
        const R = h(b);
        r.queue.drawElementImageToTexture(
          { source: b.element, premultiplyAlpha: "premultiply" },
          { texture: R.texture }
        );
      }
      const T = r.createCommandEncoder(), S = T.beginRenderPass({
        colorAttachments: [
          {
            view: s.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      });
      S.setPipeline(c), S.setVertexBuffer(0, l);
      for (const b of E) {
        const R = u.get(b.id);
        if (!R) continue;
        const A = b.x, M = b.y, P = b.x + b.width, _ = b.y + b.height, $ = new Float32Array([
          A,
          M,
          0,
          0,
          P,
          M,
          1,
          0,
          A,
          _,
          0,
          1,
          A,
          _,
          0,
          1,
          P,
          M,
          1,
          0,
          P,
          _,
          1,
          1
        ]);
        r.queue.writeBuffer(l, 0, $);
        const L = me(b, y, w), F = new Float32Array(20);
        F.set(L, 0), F[16] = b.opacity, r.queue.writeBuffer(p, 0, F);
        const I = r.createBindGroup({
          layout: c.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: f },
            { binding: 1, resource: R.view },
            { binding: 2, resource: { buffer: p } }
          ]
        });
        S.setBindGroup(0, I), S.draw(6);
      }
      return S.end(), r.queue.submit([T.finish()]), E.length;
    },
    dispose() {
      for (const m of u.values()) m.texture.destroy();
      u.clear(), l.destroy(), p.destroy();
    }
  };
}
const ct = Math.PI / 180, St = 1200, lt = 60;
function z(e) {
  return Math.max(-lt, Math.min(lt, e));
}
function At() {
  return {
    m11: 1,
    m12: 0,
    m13: 0,
    m14: 0,
    m21: 0,
    m22: 1,
    m23: 0,
    m24: 0,
    m31: 0,
    m32: 0,
    m33: 1,
    m34: 0,
    m41: 0,
    m42: 0,
    m43: 0,
    m44: 1
  };
}
function J(e, t) {
  const n = [
    [e.m11, e.m21, e.m31, e.m41],
    [e.m12, e.m22, e.m32, e.m42],
    [e.m13, e.m23, e.m33, e.m43],
    [e.m14, e.m24, e.m34, e.m44]
  ], i = [
    [t.m11, t.m21, t.m31, t.m41],
    [t.m12, t.m22, t.m32, t.m42],
    [t.m13, t.m23, t.m33, t.m43],
    [t.m14, t.m24, t.m34, t.m44]
  ], r = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  for (let s = 0; s < 4; s++)
    for (let o = 0; o < 4; o++) {
      let a = 0;
      for (let c = 0; c < 4; c++)
        a += n[s][c] * i[c][o];
      r[s][o] = a;
    }
  return {
    m11: r[0][0],
    m12: r[1][0],
    m13: r[2][0],
    m14: r[3][0],
    m21: r[0][1],
    m22: r[1][1],
    m23: r[2][1],
    m24: r[3][1],
    m31: r[0][2],
    m32: r[1][2],
    m33: r[2][2],
    m34: r[3][2],
    m41: r[0][3],
    m42: r[1][3],
    m43: r[2][3],
    m44: r[3][3]
  };
}
function ut(e, t) {
  return { ...At(), m41: e, m42: t };
}
function pe(e) {
  return { ...At(), m34: -1 / e };
}
function xe(e, t) {
  const n = e * ct, i = t * ct, r = Math.cos(n), s = Math.sin(n), o = Math.cos(i), a = Math.sin(i), c = o, f = 0, l = a, p = s * a, u = r, d = -s * o, h = -r * a, m = s, g = r * o;
  return {
    m11: c,
    m12: p,
    m13: h,
    m14: 0,
    m21: f,
    m22: u,
    m23: m,
    m24: 0,
    m31: l,
    m32: d,
    m33: g,
    m34: 0,
    m41: 0,
    m42: 0,
    m43: 0,
    m44: 1
  };
}
function ye(e) {
  const t = e.tilt.perspective && e.tilt.perspective > 0 ? e.tilt.perspective : St, n = z(e.tilt.x), i = z(e.tilt.y), r = (e.originX ?? 0.5) * e.width, s = (e.originY ?? 0.5) * e.height;
  return { matrix: J(
    ut(r, s),
    J(pe(t), J(xe(n, i), ut(-r, -s)))
  ), perspective: t, tiltX: n, tiltY: i };
}
function N(e, t = 0.5, n = 0.5) {
  const i = e.perspective && e.perspective > 0 ? e.perspective : St, r = z(e.x), s = z(e.y);
  return `${(t * 100).toFixed(4)}`, `${(n * 100).toFixed(4)}`, `perspective(${i}px) rotateX(${r}deg) rotateY(${s}deg)`;
}
function ve(e) {
  return new DOMMatrix([
    e.m11,
    e.m12,
    e.m13,
    e.m14,
    e.m21,
    e.m22,
    e.m23,
    e.m24,
    e.m31,
    e.m32,
    e.m33,
    e.m34,
    e.m41,
    e.m42,
    e.m43,
    e.m44
  ]);
}
function be(e) {
  const t = e.element, n = e.previousTransform ?? t.style.transform, i = e.previousTransformOrigin ?? t.style.transformOrigin, r = t.offsetWidth || t.getBoundingClientRect().width, s = t.offsetHeight || t.getBoundingClientRect().height;
  if (r < 2 || s < 2)
    return {
      ok: !1,
      samples: [],
      detail: `tilt witness: element has empty box (${r}×${s})`
    };
  const o = e.originX ?? 0.5, a = e.originY ?? 0.5;
  t.style.transformOrigin = `${(o * 100).toFixed(4)}% ${(a * 100).toFixed(4)}%`, t.style.transform = N(e.tilt, o, a), t.offsetWidth, e.syncHits?.(), t.offsetWidth;
  const c = Math.max(16, r * 0.18), f = Math.max(14, s * 0.18), l = [
    { label: "center", lx: r / 2, ly: s / 2 },
    { label: "tl", lx: c, ly: f },
    { label: "tr", lx: r - c, ly: f },
    { label: "bl", lx: c, ly: s - f },
    { label: "br", lx: r - c, ly: s - f }
  ], p = [];
  for (const h of l) {
    const m = document.createElement("i");
    m.setAttribute("data-figment-tilt-marker", "1"), m.style.cssText = `position:absolute;left:${h.lx}px;top:${h.ly}px;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none;`, t.append(m);
    let g = { x: 0, y: 0 };
    try {
      const w = m.getBoundingClientRect();
      g = { x: w.left, y: w.top };
    } finally {
      m.remove();
    }
    const v = document.elementFromPoint(g.x, g.y), y = !!v && (v === t || t.contains(v));
    p.push({
      label: h.label,
      client: g,
      matched: y,
      actualId: y ? t.id || "target" : v?.id || v?.tagName.toLowerCase() || null
    });
  }
  t.style.transform = n, t.style.transformOrigin = i;
  const u = p.filter((h) => !h.matched), d = p.length > 0 && u.length === 0;
  return {
    ok: d,
    samples: p,
    detail: d ? `tilt witness ok: ${p.length} points matched under ${N(e.tilt, o, a)}` : `tilt witness failed at ${u.map((h) => h.label).join(", ")} under ${N(e.tilt, o, a)}`
  };
}
class we {
  constructor(t, n, i, r) {
    this.id = t, this.element = n, this.host = i, this.record = r;
  }
  id;
  element;
  host;
  record;
  setTransform(t) {
    Object.assign(this.record.transform, t), this.record.dirty = !0, this.host.refreshLayerCss(this.record), this.host.syncLayerGeometry(this.record), this.host.requestPaint();
  }
  setOrigin(t) {
    this.record.origin = t, this.record.dirty = !0, this.host.refreshLayerCss(this.record), this.host.syncLayerGeometry(this.record), this.host.requestPaint();
  }
  setClip(t) {
    t ? this.record.clip = t : delete this.record.clip, this.record.dirty = !0, this.host.syncLayerGeometry(this.record), this.host.requestPaint();
  }
  updateGeometry(t) {
    t.canvasTransform && (this.record.canvasTransform = t.canvasTransform), t.canvasClip === null ? delete this.record.clip : t.canvasClip && (this.record.clip = t.canvasClip), typeof t.preserveHitTestOrder == "boolean" && (this.record.preserveHitTestOrder = t.preserveHitTestOrder), this.record.dirty = !0, this.host.syncLayerGeometry(this.record), this.host.requestPaint();
  }
  invalidate() {
    this.record.dirty = !0, this.host.requestPaint();
  }
  dispose() {
    this.host.removeLayer(this.id);
  }
}
class Ee {
  backend;
  canvas;
  ctx;
  registry;
  metrics = Zt();
  paintTimeoutMs;
  globalNestedMarks = [];
  units;
  unitState;
  mutations = null;
  detachInputs = null;
  paintHandler = null;
  raf = 0;
  destroyed = !1;
  health = "idle";
  lastError;
  pendingPaintOnce = [];
  mountRoot = null;
  admission = null;
  /** M2c: covered until the first complete frame, then swap in. */
  pendingEnable = !0;
  savedPointerEvents = "";
  pendingCover = null;
  camera = Qt();
  webgl = null;
  webgpu = null;
  webgpuReady = null;
  webgpuInitError = null;
  constructor(t, n) {
    if (this.canvas = t, this.backend = n.backend, this.paintTimeoutMs = n.paintTimeoutMs ?? 2e3, Dt(t), Vt(t), t.dataset.figmentHost = "1", n.backend === "2d") {
      const i = t.getContext("2d");
      if (!i)
        throw new x("missing-api", "2D context unavailable");
      this.ctx = i;
    } else n.backend === "webgl" ? (this.webgl = de(t), this.ctx = t.getContext("2d") ?? {}) : (this.ctx = t.getContext("2d") ?? {}, this.webgpuReady = ge(t).then((i) => {
      this.webgpu = i, this.requestPaint();
    }).catch((i) => {
      this.health = "failed", this.lastError = i instanceof Error ? i.message : String(i), this.webgpuInitError = i;
      const r = this.pendingPaintOnce.splice(0);
      for (const s of r) s();
      throw i;
    }));
    this.registry = new Kt(n.budgets?.layers ?? 32), this.units = jt(t, (i) => {
      this.unitState = i, this.registry.markAllDirty(), this.requestPaint();
    }), this.unitState = this.units.state(), this.paintHandler = (i) => {
      const r = i.changedElements;
      if (r && r.length > 0)
        for (const s of r) {
          const o = this.registry.findByElement(s) ?? this.registry.findForTarget(s);
          o ? o.dirty = !0 : this.registry.markAllDirty();
        }
      else
        this.registry.markAllDirty();
      this.flushPaint(!0);
    }, t.addEventListener("paint", this.paintHandler), this.health = "idle", this.armSeamlessEnable();
  }
  /**
   * M2c — hide the surface until a complete first frame exists.
   * Cover with a same-box overlay (not opacity:0 — that suppresses
   * drawElementImage capture). Swap only when pixels actually landed.
   */
  armSeamlessEnable() {
    this.pendingEnable = !0, this.savedPointerEvents = this.canvas.style.pointerEvents, this.canvas.dataset.figmentPending = "1";
    const t = this.canvas.parentElement;
    t && getComputedStyle(t).position === "static" && (t.style.position = "relative");
    const n = document.createElement("div");
    n.setAttribute("data-figment-pending-cover", "1");
    const i = this.canvas.style.background || "#12161f";
    if (n.style.cssText = [
      "position:absolute",
      "inset:0",
      `background:${i}`,
      "pointer-events:none",
      "z-index:1"
    ].join(";"), this.pendingCover = n, t) {
      const r = this.canvas.getBoundingClientRect();
      n.style.left = `${this.canvas.offsetLeft}px`, n.style.top = `${this.canvas.offsetTop}px`, n.style.width = `${r.width || this.canvas.clientWidth}px`, n.style.height = `${r.height || this.canvas.clientHeight}px`, n.style.right = "auto", n.style.bottom = "auto", t.append(n);
    }
  }
  revealIfComplete(t) {
    if (this.pendingEnable && !(t <= 0)) {
      if (this.backend === "2d" && !this.frameHasPixels()) {
        this.requestBrowserPaint();
        return;
      }
      this.pendingEnable = !1, delete this.canvas.dataset.figmentPending, this.pendingCover?.remove(), this.pendingCover = null, this.metrics.seamlessSwaps += 1;
    }
  }
  /** True when at least one opaque pixel landed on the surface. */
  frameHasPixels() {
    const { width: t, height: n } = this.canvas;
    if (t < 1 || n < 1) return !1;
    for (let i = 1; i <= 4; i++)
      for (let r = 1; r <= 4; r++) {
        const s = Math.floor(t * r / 5), o = Math.floor(n * i / 5);
        try {
          const { data: a } = this.ctx.getImageData(s, o, 1, 1);
          if ((a[3] ?? 0) > 0) return !0;
        } catch {
          return !1;
        }
      }
    return !1;
  }
  cancelSeamlessEnable() {
    this.pendingEnable && (this.pendingEnable = !1, delete this.canvas.dataset.figmentPending, this.pendingCover?.remove(), this.pendingCover = null);
  }
  /** Ask the browser for a paint event (draw happens in that handler). */
  requestBrowserPaint() {
    if (this.destroyed) return;
    const t = this.canvas.requestPaint;
    if (typeof t == "function") {
      t.call(this.canvas);
      return;
    }
    this.requestPaint();
  }
  mount(t) {
    if (this.mountRoot)
      throw new k("host already mounted");
    return this.mountRoot = t, this.globalNestedMarks.push(...rt(t)), this.mutations = Gt(t, (n) => {
      const i = this.registry.findForTarget(n) ?? this.registry.findByElement(n);
      if (i)
        i.dirty = !0;
      else
        for (const r of this.registry.all())
          (t.contains(r.element) || r.element.contains(n)) && (r.dirty = !0);
      this.metrics.mutationsIgnored = this.mutations?.stats.ignored ?? 0, this.requestPaint();
    }), this.detachInputs = Bt(t, (n) => {
      const i = this.registry.findForTarget(n) ?? this.registry.findByElement(n);
      i && (i.dirty = !0), this.requestPaint();
    }, this.metrics), () => this.unmount();
  }
  unmount() {
    this.mutations?.stop(), this.mutations = null, this.detachInputs?.(), this.detachInputs = null, K(this.globalNestedMarks.splice(0)), this.mountRoot = null, this.registry.markAllDirty(), this.requestPaint();
  }
  async admit() {
    if (this.destroyed) throw new k("host destroyed");
    this.health = "pending";
    try {
      const t = await qt();
      return this.admission = t, this.health = "healthy", this.lastError = void 0, t;
    } catch (t) {
      throw this.health = "failed", this.lastError = t instanceof Error ? t.message : String(t), t;
    }
  }
  layer(t, n = {}) {
    if (this.destroyed) throw new k("host destroyed");
    const i = this.registry.add(t, n);
    if (Wt(t), this.mountRoot && (i.nestedMarks = rt(t), this.metrics.nestedCanvasMarks += i.nestedMarks.length), this.refreshLayerCss(i), this.syncLayerGeometry(i), this.requestPaint(), i.tilt && (i.tilt.x !== 0 || i.tilt.y !== 0)) {
      if (!(t instanceof HTMLElement))
        throw this.removeLayer(i.id), new x(
          "tilt-unsupported",
          "tilt requires an HTMLElement target for the admission witness"
        );
      const r = i.origin === "center" ? 0.5 : i.origin === "top-left" ? 0 : typeof i.origin == "object" ? i.origin.x : 0.5, s = i.origin === "center" ? 0.5 : i.origin === "top-left" ? 0 : typeof i.origin == "object" ? i.origin.y : 0.5, o = this.canvas.style.pointerEvents;
      this.canvas.style.pointerEvents = "auto";
      const a = be({
        element: t,
        tilt: i.tilt,
        originX: r,
        originY: s,
        // Push hit order only — a projective canvasTransform here blanks
        // elementFromPoint (same footgun as canvasClip / WICG #186).
        syncHits: () => {
          const c = this.canvas;
          typeof c.updateElementGeometry == "function" && c.updateElementGeometry(t, {
            preserveHitTestOrder: i.preserveHitTestOrder
          });
        }
      });
      if (this.canvas.style.pointerEvents = o, this.metrics.tiltWitnesses += 1, !a.ok)
        throw this.metrics.tiltWitnessFailures += 1, this.removeLayer(i.id), new x(
          "tilt-unsupported",
          `${a.detail}. Browser cannot hit-test this tilt (see ACTIVATION.md / WICG).`
        );
    }
    return this.requestPaint(), new we(i.id, t, this, i);
  }
  removeLayer(t) {
    const n = this.registry.remove(t);
    n && (this.clearLayerGeometry(n), st(n.element), K(n.nestedMarks), this.registry.markAllDirty(), this.requestPaint());
  }
  refreshLayerCss(t) {
    t.element instanceof HTMLElement && Rt(
      t.element,
      t,
      this.camera.perspective,
      this.camera.z
    );
  }
  updateGeometry(t, n) {
    const i = this.registry.get(t);
    if (!i) throw new k(`unknown layer "${t}"`);
    n.canvasTransform && (i.canvasTransform = n.canvasTransform), n.canvasClip === null ? delete i.clip : n.canvasClip && (i.clip = n.canvasClip), typeof n.preserveHitTestOrder == "boolean" && (i.preserveHitTestOrder = n.preserveHitTestOrder), i.dirty = !0, this.syncLayerGeometry(i), this.requestPaint();
  }
  clearGeometry(t) {
    const n = this.registry.get(t);
    n && (this.clearLayerGeometry(n), this.metrics.geometryClears += 1);
  }
  /**
   * M2d — push canonical geometry to the browser hit stack.
   * `preserveHitTestOrder: true` by default so background redraws do not
   * steal clicks (ACTIVATION.md “last drawn wins” footgun).
   */
  syncLayerGeometry(t) {
    Te(t);
    const n = this.canvas;
    if (typeof n.updateElementGeometry != "function") return;
    const i = {
      preserveHitTestOrder: t.preserveHitTestOrder
    };
    if (this.backend === "webgl" || this.backend === "webgpu") {
      const s = t.element, o = s.getBoundingClientRect(), a = o.width || s.offsetWidth, c = o.height || s.offsetHeight, f = t.drawAt ? t.drawAt.x : t.transform.x, l = t.drawAt ? t.drawAt.y : t.transform.y, p = t.transform.z - this.camera.z, u = this.camera.perspective / Math.max(1e-3, this.camera.perspective - p), d = this.camera.origin ?? {
        x: this.unitState.cssSize.x / 2,
        y: this.unitState.cssSize.y / 2
      };
      Math.cos(t.transform.rotation * Math.PI / 180), Math.sin(t.transform.rotation * Math.PI / 180);
      const h = f + a / 2, m = l + c / 2, g = new DOMMatrix();
      g.translateSelf(d.x, d.y), g.scaleSelf(u, u), g.translateSelf(-d.x, -d.y), g.translateSelf(h, m), g.rotateSelf(t.transform.rotation), g.scaleSelf(t.transform.scaleX, t.transform.scaleY), g.translateSelf(-h, -m), g.translateSelf(f, l), i.canvasTransform = g;
    } else if (t.tilt && (t.tilt.x !== 0 || t.tilt.y !== 0)) {
      const s = t.element, o = s.offsetWidth || s.getBoundingClientRect().width, a = s.offsetHeight || s.getBoundingClientRect().height, c = t.origin === "center" ? 0.5 : t.origin === "top-left" ? 0 : t.origin.x, f = t.origin === "center" ? 0.5 : t.origin === "top-left" ? 0 : t.origin.y, l = ye({
        tilt: t.tilt,
        width: o,
        height: a,
        originX: c,
        originY: f
      });
      i.canvasTransform = ve(l.matrix);
    } else t.canvasTransform && (i.canvasTransform = t.canvasTransform);
    try {
      n.updateElementGeometry(t.element, i), this.metrics.geometryUpdates += 1;
    } catch (s) {
      this.health = "failed", this.lastError = s instanceof Error ? s.message : String(s);
    }
  }
  clearLayerGeometry(t) {
    const n = this.canvas;
    if (typeof n.clearElementGeometry == "function")
      try {
        n.clearElementGeometry(t.element), this.metrics.geometryClears += 1;
      } catch (i) {
        this.lastError = i instanceof Error ? i.message : String(i);
      }
  }
  requestPaint() {
    if (this.destroyed) return;
    const t = this.canvas.requestPaint;
    if (typeof t == "function") {
      t.call(this.canvas);
      return;
    }
    this.raf || (this.raf = requestAnimationFrame(() => {
      this.raf = 0, this.flushPaint(!1);
    }));
  }
  invalidate(t) {
    if (t) {
      const n = this.registry.get(t.id);
      n && (n.dirty = !0);
    } else
      this.registry.markAllDirty();
    this.requestPaint();
  }
  setCamera(t) {
    this.camera = { ...t }, this.registry.markAllDirty();
    for (const n of this.registry.all())
      Mt(n, this.camera.perspective, this.camera.z), this.syncLayerGeometry(n);
    this.requestPaint();
  }
  getCamera() {
    return { ...this.camera };
  }
  paintOnce() {
    return new Promise((t, n) => {
      const i = () => this.schedulePaintOnce(t, n);
      if (this.backend === "webgpu" && this.webgpuReady && !this.webgpu) {
        this.webgpuReady.then(i).catch((r) => n(r));
        return;
      }
      i();
    });
  }
  /**
   * M5d — export readiness → PNG (or other image type).
   * Paints one complete frame first, then snapshots the surface.
   */
  async exportPng(t = {}) {
    await this.paintOnce();
    const n = t.type ?? "image/png", i = this.canvas;
    if (typeof i.toBlob == "function") {
      const s = await new Promise((o) => {
        i.toBlob(
          (a) => o(a),
          n,
          t.quality
        );
      });
      if (!s)
        throw new nt(`exportPng: toBlob returned null (${n})`);
      return s;
    }
    const r = i.toDataURL(n, t.quality);
    return Se(r);
  }
  exportDataUrl(t = "image/png") {
    return this.canvas.toDataURL(t);
  }
  schedulePaintOnce(t, n) {
    const i = setTimeout(() => {
      this.pendingPaintOnce = this.pendingPaintOnce.filter((s) => s !== r), n(new nt(`paintOnce timed out after ${this.paintTimeoutMs}ms`));
    }, this.paintTimeoutMs), r = () => {
      clearTimeout(i), t();
    };
    this.pendingPaintOnce.push(r), this.registry.markAllDirty(), this.requestPaint();
  }
  flushPaint(t) {
    if (this.destroyed) return;
    const n = this.registry.all(), i = n.filter((s) => s.dirty);
    if (!t && i.length === 0) {
      if (this.metrics.skippedFrames += 1, this.pendingPaintOnce.length) {
        this.flushPaint(!0);
        return;
      }
      return;
    }
    try {
      if (this.backend === "webgpu" && !this.webgpu) {
        if (this.webgpuInitError) {
          this.health = "failed", this.lastError = this.webgpuInitError instanceof Error ? this.webgpuInitError.message : String(this.webgpuInitError);
          const a = this.pendingPaintOnce.splice(0);
          for (const c of a) c();
          return;
        }
        this.webgpuReady?.then(() => this.requestPaint()).catch(() => {
        });
        return;
      }
      this.backend === "2d" && this.ctx.reset && this.ctx.reset();
      const s = {
        cssSize: this.unitState.cssSize,
        unitScale: this.unitState.scale,
        camera: this.camera
      };
      let o = 0;
      this.webgl ? o = this.webgl.draw(n, s) : this.webgpu ? o = this.webgpu.draw(n, s) : o = re({
        ctx: this.ctx,
        layers: n,
        cssSize: this.unitState.cssSize,
        unitScale: this.unitState.scale,
        camera: this.camera,
        onlyDirty: !1
      }), this.metrics.paints += 1, this.metrics.layersDrawn += o, this.metrics.dirtyRedraws += i.length, this.health = "healthy", this.lastError = void 0;
      for (const a of n) this.syncLayerGeometry(a);
      this.revealIfComplete(o);
    } catch (s) {
      this.health = "failed", this.lastError = s instanceof Error ? s.message : String(s);
    }
    const r = this.pendingPaintOnce.splice(0);
    for (const s of r) s();
  }
  cssToCanvas(t, n = "x") {
    return t * this.unitState.scale[n];
  }
  canvasToCss(t, n = "x") {
    const i = this.unitState.scale[n];
    return i === 0 ? t : t / i;
  }
  clientToCanvas(t) {
    const n = this.canvas.getBoundingClientRect();
    return {
      x: (t.x - n.left) * this.unitState.scale.x,
      y: (t.y - n.top) * this.unitState.scale.y
    };
  }
  state() {
    return Jt({
      backend: this.backend,
      health: this.health,
      supported: !0,
      pendingEnable: this.pendingEnable,
      canvasGrid: this.unitState.canvasGrid,
      cssSize: this.unitState.cssSize,
      unitScale: this.unitState.scale,
      layers: this.registry.all().map((t) => ({ id: t.id, dirty: t.dirty })),
      admission: this.admission,
      metrics: {
        ...this.metrics,
        mutationsIgnored: this.mutations?.stats.ignored ?? this.metrics.mutationsIgnored
      },
      ...this.lastError !== void 0 ? { lastError: this.lastError } : {}
    });
  }
  async destroy() {
    if (this.destroyed) return;
    this.destroyed = !0, this.raf && cancelAnimationFrame(this.raf), this.raf = 0, this.unmount();
    for (const n of this.registry.all())
      st(n.element), K(n.nestedMarks);
    this.registry.clear(), this.units.stop(), this.webgl?.dispose(), this.webgl = null, this.webgpu?.dispose(), this.webgpu = null, this.paintHandler && (this.canvas.removeEventListener("paint", this.paintHandler), this.paintHandler = null), this.cancelSeamlessEnable(), this.canvas.removeAttribute("content"), delete this.canvas.dataset.figmentHost, this.health = "idle";
    const t = this.pendingPaintOnce.splice(0);
    for (const n of t) n();
  }
}
function Mt(e, t = 1200, n = 0) {
  const i = e.element;
  i instanceof HTMLElement && Rt(i, e, t, n);
}
function Rt(e, t, n = 1200, i = 0) {
  e.style.transformOrigin = Pt(t.origin);
  const r = !!t.tilt && (t.tilt.x !== 0 || t.tilt.y !== 0), s = t.transform.z !== 0, o = t.transform.rotation !== 0 || t.transform.scaleX !== 1 || t.transform.scaleY !== 1 || t.transform.rotateX !== 0 || t.transform.rotateY !== 0;
  if (!r && !s && !o) {
    (e.dataset.figmentTilt === "1" || e.dataset.figmentZ === "1") && (e.style.transform = "", e.style.perspective = "", delete e.dataset.figmentTilt, delete e.dataset.figmentZ);
    return;
  }
  if (r && t.tilt) {
    const a = t.origin === "center" ? 0.5 : t.origin === "top-left" ? 0 : t.origin.x, c = t.origin === "center" ? 0.5 : t.origin === "top-left" ? 0 : t.origin.y;
    e.style.transform = N(t.tilt, a, c), e.dataset.figmentTilt = "1";
    return;
  }
  e.style.transform = ie({
    x: t.transform.x,
    y: t.transform.y,
    z: t.transform.z,
    scaleX: t.transform.scaleX,
    scaleY: t.transform.scaleY,
    rotation: t.transform.rotation,
    rotateX: t.transform.rotateX,
    rotateY: t.transform.rotateY,
    opacity: t.transform.opacity,
    perspective: n,
    cameraZ: i
  }), e.dataset.figmentZ = "1";
}
function Pt(e) {
  return e === "top-left" ? "top left" : e === "center" ? "center" : `${(e.x * 100).toFixed(4)}% ${(e.y * 100).toFixed(4)}%`;
}
function Te(e) {
  const t = e.element;
  if (!(t instanceof HTMLElement)) return;
  if (t.style.transformOrigin = Pt(e.origin), Mt(e), !e.clip) {
    t.style.clipPath = "";
    return;
  }
  const n = e.drawAt ? e.drawAt.x : e.transform.x, i = e.drawAt ? e.drawAt.y : e.transform.y, r = t.getBoundingClientRect(), s = r.width || t.offsetWidth, o = r.height || t.offsetHeight;
  if (s <= 0 || o <= 0) return;
  const a = e.clip.x - n, c = e.clip.y - i, f = a + e.clip.width, l = c + e.clip.height, p = Math.max(0, c), u = Math.max(0, a), d = Math.max(0, s - f), h = Math.max(0, o - l);
  t.style.clipPath = `inset(${p}px ${d}px ${h}px ${u}px)`;
}
function Se(e) {
  const t = e.indexOf(","), n = e.slice(0, t), i = e.slice(t + 1), r = /data:([^;]+)/.exec(n)?.[1] ?? "application/octet-stream";
  if (n.includes(";base64")) {
    const s = atob(i), o = new Uint8Array(s.length);
    for (let a = 0; a < s.length; a++) o[a] = s.charCodeAt(a);
    return new Blob([o], { type: r });
  }
  return new Blob([decodeURIComponent(i)], { type: r });
}
function Ae(e, t) {
  if (!(e instanceof HTMLCanvasElement))
    throw new x(
      "missing-api",
      "M1 createHost requires an HTMLCanvasElement (OffscreenCanvas in a later milestone)."
    );
  return new Ee(e, t);
}
const Me = /* @__PURE__ */ new Map();
function _t(e) {
  return Me.get(e);
}
function Ct(e, t) {
  return Number.isFinite(t) ? Math.max(e.min, Math.min(e.max, t)) : e.min;
}
const ft = 3;
function $t(e, t) {
  if (e.length > ft)
    throw new x(
      "probe-failed",
      `effect chain length ${e.length} exceeds shader budget (${ft})`
    );
  for (const n of e)
    switch (n.kind) {
      case "ripple":
        if (!Number.isFinite(n.amplitude))
          throw new x("probe-failed", "ripple.amplitude must be finite");
        break;
      case "chromatic":
        if (!Number.isFinite(n.offset))
          throw new x("probe-failed", "chromatic.offset must be finite");
        break;
      case "dissolve":
        if (n.progress < 0 || n.progress > 1)
          throw new x("probe-failed", "dissolve.progress must be 0..1");
        break;
      case "custom": {
        if (!n.id)
          throw new x("probe-failed", "custom effect requires id");
        const i = _t(n.id);
        if (!i)
          throw new x(
            "probe-failed",
            `custom effect "${n.id}" is not defined — call defineEffect first`
          );
        for (const [r, s] of Object.entries(n.params ?? {})) {
          const o = i.params.find((a) => a.name === r);
          o && Ct(o, s);
        }
        break;
      }
      default: {
        const i = n.kind;
        throw new x("probe-failed", `unknown effect kind: ${i}`);
      }
    }
  return e;
}
const Re = `
// --- figment effects (M3b) ---

// Value noise (stable, cheap).
float figmentHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float figmentNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = figmentHash(i);
  float b = figmentHash(i + vec2(1.0, 0.0));
  float c = figmentHash(i + vec2(0.0, 1.0));
  float d = figmentHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Radial ripple: displaces UV along the wave. amp=0 is identity.
vec2 figmentRippleUV(vec2 uv, float amp, float edge) {
  vec2 c = uv - vec2(0.5);
  float d = length(c) + 1e-5;
  float ring = sin(d * 28.0) * amp;
  float falloff = smoothstep(max(edge, 0.0), 0.0, d);
  return uv + (c / d) * ring * falloff * 0.08;
}

// Chromatic aberration: split RGB along an axis.
vec4 figmentChromaticSample(sampler2D tex, vec2 uv, float off) {
  float r = texture2D(tex, uv + vec2(off, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - vec2(off, 0.0)).b;
  float a = texture2D(tex, uv).a;
  return vec4(r, g, b, a);
}

// Dissolve: noise threshold eats alpha as progress goes 0 → 1.
vec4 figmentDissolveSample(sampler2D tex, vec2 uv, float progress) {
  vec4 c = texture2D(tex, uv);
  float n = figmentNoise(uv * 72.0);
  float cut = smoothstep(progress - 0.08, progress + 0.08, n);
  return vec4(c.rgb, c.a * cut);
}
`;
function Pe(e) {
  if (e.kind === "ripple") {
    const t = e.edge ?? 1;
    return `uv = figmentRippleUV(uv, ${e.amplitude.toFixed(4)}, ${t.toFixed(4)});`;
  }
  return "";
}
function _e(e) {
  switch (e.kind) {
    case "ripple":
    case "chromatic":
      return e.kind === "chromatic" ? `c = figmentChromaticSample(u_tex, uv, ${e.offset.toFixed(4)}) * u_alpha;` : "c = texture2D(u_tex, uv) * u_alpha;";
    case "dissolve":
      return `c = figmentDissolveSample(u_tex, uv, ${e.progress.toFixed(4)}) * u_alpha;`;
    case "custom":
      return `/* custom ${e.id} */`;
    default:
      return "";
  }
}
const Y = { min: 0.88, max: 1.12 };
function Ce(e) {
  const t = Q(e.bevel ?? 0.12, 0, 0.5), n = Q(e.depth ?? 0.35, 0, 1), i = 1 + (t * 0.4 + n * 0.08), r = Q(
    i,
    Y.min,
    Y.max
  );
  return { kind: "relief", bevel: t, depth: n, brightness: r };
}
function Q(e, t, n) {
  return Number.isFinite(e) ? Math.max(t, Math.min(n, e)) : t;
}
const $e = `
// M3d relief: bevel highlight/shadow on the UV border, brightness-safe.
vec4 figmentRelief(vec4 c, vec2 uv, float bevel, float depth, float brightness) {
  vec2 d = min(uv, vec2(1.0) - uv);
  float edge = min(d.x, d.y);
  float band = smoothstep(0.0, max(bevel, 1e-4), edge);
  // Top/left lighter, bottom/right darker — reads as extrusion.
  float light = (1.0 - band) * (1.0 - depth) * 0.35 - (1.0 - band) * depth * 0.2;
  float factor = brightness + light;
  // Hard clamp: never destroy contrast of live text.
  factor = clamp(factor, ${Y.min.toFixed(2)}, ${Y.max.toFixed(2)});
  return vec4(c.rgb * factor, c.a);
}
`;
function Le(e) {
  return `c = figmentRelief(c, uv, ${e.bevel.toFixed(4)}, ${e.depth.toFixed(4)}, ${e.brightness.toFixed(4)});`;
}
function Fe(e) {
  return {
    kind: "stage",
    tint: De(e.tint ?? "#12161f"),
    vignette: dt(e.vignette ?? 0.45, 0, 1),
    grain: dt(e.grain ?? 0.08, 0, 1)
  };
}
function dt(e, t, n) {
  return Number.isFinite(e) ? Math.max(t, Math.min(n, e)) : t;
}
function De(e) {
  const t = e.replace("#", "").trim(), n = t.length === 3 ? t.split("").map((i) => i + i).join("") : t;
  if (!/^[0-9a-fA-F]{6}$/.test(n))
    throw new x(
      "probe-failed",
      `stage.tint must be a hex color, got ${e}`
    );
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255
  };
}
const ke = `
// M3e stage: decorative ground plane (vignette + tint + fine grain).
float stageHash(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
}

vec4 figmentStage(vec4 c, vec2 uv, vec3 tint, float vignette, float grain) {
  // Ground: blend toward tint by a soft radial falloff (reads as a stage floor).
  vec2 p = uv - vec2(0.5);
  float r = length(p) * 1.4142;
  float vign = 1.0 - vignette * smoothstep(0.35, 1.0, r);
  vec3 ground = mix(c.rgb, tint, 0.55 * vign);
  float n = stageHash(uv * 256.0) - 0.5;
  ground += n * grain * 0.12;
  return vec4(ground * vign, c.a);
}
`;
function Ie(e) {
  const t = e.tint;
  return `c = figmentStage(c, uv, vec3(${t.r.toFixed(4)}, ${t.g.toFixed(4)}, ${t.b.toFixed(4)}), ${e.vignette.toFixed(4)}, ${e.grain.toFixed(4)});`;
}
const Oe = 0.08;
function Ge(e) {
  const t = X(e.ior ?? 1.25, 1, 2.5), n = Be(e.tint ?? "#c8d8ff"), i = X(e.dispersion ?? 0.15, 0, 1), r = X(e.frost ?? 0.2, 0, 1), s = X((t - 1) * 0.12, 0, Oe);
  return { kind: "glass", ior: t, tint: n, dispersion: i, frost: r, refraction: s };
}
function X(e, t, n) {
  return Number.isFinite(e) ? Math.max(t, Math.min(n, e)) : t;
}
function Be(e) {
  const t = e.replace("#", "").trim(), n = t.length === 3 ? t.split("").map((i) => i + i).join("") : t;
  if (!/^[0-9a-fA-F]{6}$/.test(n))
    throw new x(
      "probe-failed",
      `glass.tint must be a hex color, got ${e}`
    );
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255
  };
}
const Ue = `
// M3f glass: bounded refraction + dispersion + tint (text stays readable).
vec2 glassRefractUV(vec2 uv, float ior, float amount) {
  vec2 c = uv - vec2(0.5);
  float r = length(c) + 1e-5;
  // Pseudo-normal: bend toward the edge like a lens.
  float bend = (1.0 / max(ior, 1.0) - 1.0) * amount;
  return uv + (c / r) * bend * r * r;
}

vec4 figmentGlass(
  sampler2D tex,
  vec2 uv,
  float ior,
  float refraction,
  float dispersion,
  float frost,
  vec3 tint
) {
  vec2 baseUV = glassRefractUV(uv, ior, refraction);
  float dsp = dispersion * refraction * 1.5;
  float r = texture2D(tex, glassRefractUV(uv, ior + dsp, refraction)).r;
  vec4 mid = texture2D(tex, baseUV);
  float b = texture2D(tex, glassRefractUV(uv, ior - dsp, refraction)).b;
  // Frost: cheap 4-tap soften.
  vec4 soft = mid;
  if (frost > 0.001) {
    vec2 o = vec2(frost * 0.01);
    soft = (
      texture2D(tex, baseUV + vec2(o.x, 0.0)) +
      texture2D(tex, baseUV - vec2(o.x, 0.0)) +
      texture2D(tex, baseUV + vec2(0.0, o.y)) +
      texture2D(tex, baseUV - vec2(0.0, o.y)) +
      mid
    ) * 0.2;
  }
  vec4 c = vec4(r, soft.g, b, soft.a);
  // Cool glass tint — subtle so UI copy stays legible.
  c.rgb = mix(c.rgb, c.rgb * tint, 0.35);
  return c;
}
`;
function He(e) {
  const t = e.tint;
  return `c = figmentGlass(u_tex, uv, ${e.ior.toFixed(4)}, ${e.refraction.toFixed(4)}, ${e.dispersion.toFixed(4)}, ${e.frost.toFixed(4)}, vec3(${t.r.toFixed(4)}, ${t.g.toFixed(4)}, ${t.b.toFixed(4)}));`;
}
const ht = 4;
function mt(e) {
  return {
    id: e.id,
    x: D(e.x, -1, 2),
    y: D(e.y, -1, 2),
    r: D(e.r, 0, 1),
    g: D(e.g, 0, 1),
    b: D(e.b, 0, 1),
    intensity: D(e.intensity ?? 1, 0, 4),
    radius: D(e.radius ?? 0.45, 0.05, 2)
  };
}
function D(e, t, n) {
  return Number.isFinite(e) ? Math.max(t, Math.min(n, e)) : t;
}
function Xe(e) {
  return Array.isArray(e) ? e.length > ht ? e.slice(0, ht).map(mt) : e.map(mt) : [];
}
const Ne = `
// M3g: point lights / pointer — uniforms only, no recapture.
vec4 figmentLight(vec4 c, vec2 uv, vec3 lightSum) {
  // Relight: scale RGB by light, keep alpha (material contract: no pixel move).
  return vec4(c.rgb * lightSum, c.a);
}
`;
function ze(e, t) {
  const n = e.map((r) => {
    const s = `(${r.x.toFixed(4)} - uv.x)`, o = `(${r.y.toFixed(4)} - uv.y)`, c = `exp(-${`(${s} * ${s} + ${o} * ${o})`} / max(${(r.radius * r.radius).toFixed(6)}, 1e-4))`;
    return `vec3(${r.r.toFixed(4)}, ${r.g.toFixed(4)}, ${r.b.toFixed(4)}) * (${r.intensity.toFixed(4)} * ${c})`;
  });
  let i = "";
  if (t && t.length) {
    const r = t.map(
      (o, a) => `float _pt${a} = step(${o.x.toFixed(4)}, uv.x) * step(uv.x, ${(o.x + o.width).toFixed(4)}) * step(${o.y.toFixed(4)}, uv.y) * step(uv.y, ${(o.y + o.height).toFixed(4)}) * ${o.strength.toFixed(4)};`
    ).join(`
  `), s = t.map((o, a) => `_pt${a}`).join(", ");
    i = `
  ${r}
  float _protect = max(${s}, 0.0);
  lightSum = mix(lightSum, clamp(lightSum, 0.75, 1.35), _protect);`;
  }
  return n.length === 0 ? `vec3 lightSum = vec3(1.0);${i}
  c = figmentLight(c, uv, lightSum);` : `vec3 lightSum = vec3(1.0) + (${n.join(" + ")});${i}
  c = figmentLight(c, uv, lightSum);`;
}
function gt(e, t, n = 1) {
  return {
    id: "pointer",
    x: e,
    y: t,
    r: 1,
    g: 0.95,
    b: 0.85,
    intensity: n,
    radius: 0.55
  };
}
function Ye(e) {
  const t = G(e.x, -1, 2), n = G(e.y, -1, 2), i = G(e.width, 0, 2), r = G(e.height, 0, 2);
  return {
    x: t,
    y: n,
    width: i,
    height: r,
    strength: G(e.strength ?? 0.85, 0, 1)
  };
}
function qe(e) {
  return Array.isArray(e) ? e.slice(0, 8).map(Ye) : [];
}
function G(e, t, n) {
  return Number.isFinite(e) ? Math.max(t, Math.min(n, e)) : t;
}
const Ve = `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_resolution;
varying vec2 v_uv;
void main() {
  vec2 zeroToOne = a_pos / u_resolution;
  vec2 clip = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
  v_uv = a_uv;
}`;
function We(e, t, n, i) {
  const r = $t(e), s = r.map((u) => Pe(u)).filter(Boolean).join(`
  `), o = r.map((u) => _e(u)).filter(Boolean).join(`
  `), a = [], c = [];
  for (const u of r) {
    if (u.kind !== "custom") continue;
    const d = _t(u.id);
    if (!d) continue;
    a.push(d.glsl);
    const h = d.params.map((m) => {
      const g = u.params?.[m.name] ?? m.min;
      return Ct(m, g).toFixed(6);
    });
    c.push(
      `c = figmentCustom_${d.id}(c${h.length ? ", " : ""}${h.join(", ")});`
    );
  }
  const f = [
    ...o.split(`
`).filter(Boolean),
    ...c
  ].join(`
  `);
  let l = "";
  t && t.kind === "relief" ? l = Le(Ce(t)) : t && t.kind === "stage" ? l = Ie(Fe(t)) : t && t.kind === "glass" && (l = He(Ge(t)));
  const p = ze(
    Xe(n ?? []),
    qe(i ?? [])
  );
  return `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_alpha;
${Re}
${$e}
${ke}
${Ue}
${Ne}
${a.join(`
`)}
void main() {
  vec2 uv = v_uv;
  ${s}
  vec4 c = texture2D(u_tex, uv) * u_alpha;
  ${f}
  ${l}
  ${p}
  gl_FragColor = c;
}`;
}
function pt(e, t, n) {
  const i = e.createShader(t);
  if (!i) throw new x("missing-api", "WebGL createShader failed");
  if (e.shaderSource(i, n), e.compileShader(i), !e.getShaderParameter(i, e.COMPILE_STATUS)) {
    const r = e.getShaderInfoLog(i) ?? "compile";
    throw e.deleteShader(i), new x("missing-api", `composite shader: ${r}`);
  }
  return i;
}
function je(e) {
  const t = e.getContext("webgl", {
    alpha: !0,
    premultipliedAlpha: !0,
    antialias: !0,
    preserveDrawingBuffer: !0
  });
  if (!t)
    throw new x("missing-api", "WebGL context unavailable");
  const n = t;
  if (e.setAttribute("content", "drawable"), typeof n.texElementSubImage2D != "function")
    throw new x(
      "missing-api",
      "WebGL texElementSubImage2D missing (direct GPU upload path)"
    );
  const r = pt(n, n.VERTEX_SHADER, Ve), s = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), a = n.createBuffer();
  if (!a) throw new x("missing-api", "WebGL createBuffer failed");
  n.bindBuffer(n.ARRAY_BUFFER, a), n.bufferData(n.ARRAY_BUFFER, new Float32Array(24), n.DYNAMIC_DRAW);
  function c(f, l, p, u) {
    const d = JSON.stringify([
      f.map((g) => g.kind),
      l?.kind,
      l,
      p,
      u
    ]);
    let h = s.get(d);
    if (h) return h;
    const m = pt(
      n,
      n.FRAGMENT_SHADER,
      We(f, l, p, u)
    );
    if (h = n.createProgram(), !h) throw new x("missing-api", "WebGL createProgram failed");
    if (n.attachShader(h, r), n.attachShader(h, m), n.linkProgram(h), !n.getProgramParameter(h, n.LINK_STATUS))
      throw new x(
        "missing-api",
        `composite link: ${n.getProgramInfoLog(h) ?? "failed"}`
      );
    return s.set(d, h), h;
  }
  return {
    kind: "webgl",
    draw(f) {
      const { width: l, height: p, layers: u } = f;
      e.width = Math.max(1, Math.round(l)), e.height = Math.max(1, Math.round(p)), n.viewport(0, 0, e.width, e.height), n.clearColor(0, 0, 0, 0), n.clear(n.COLOR_BUFFER_BIT), n.enable(n.BLEND), n.blendFunc(n.ONE, n.ONE_MINUS_SRC_ALPHA);
      let d = 0;
      for (let h = 0; h < u.length; h++) {
        const m = u[h], g = m.effects ?? [];
        $t(g);
        const v = m.material, y = m.emitters, w = m.protectedText, E = Math.max(1, Math.ceil(m.width)), T = Math.max(1, Math.ceil(m.height)), S = `L${h}`;
        let b = o.get(S);
        const R = JSON.stringify([g, v]), A = JSON.stringify([y, w]);
        if (!b || b.width !== E || b.height !== T || b.effectsKey !== R || b.emittersKey !== A) {
          b && n.deleteTexture(b.texture);
          const j = n.createTexture();
          if (!j) throw new x("missing-api", "createTexture");
          n.bindTexture(n.TEXTURE_2D, j), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE), n.texImage2D(n.TEXTURE_2D, 0, n.RGBA, E, T, 0, n.RGBA, n.UNSIGNED_BYTE, null), b = {
            texture: j,
            width: E,
            height: T,
            effectsKey: R,
            emittersKey: A,
            program: c(g, v, y, w)
          }, o.set(S, b);
        }
        if (!b) throw new x("missing-api", "layer texture missing");
        n.texElementSubImage2D(n.TEXTURE_2D, 0, 0, 0, m.element, {
          premultiplyAlpha: "premultiply",
          colorSpaceConversion: "none"
        });
        const M = b.program;
        n.useProgram(M);
        const P = n.getAttribLocation(M, "a_pos"), _ = n.getAttribLocation(M, "a_uv"), $ = n.getUniformLocation(M, "u_resolution"), L = n.getUniformLocation(M, "u_tex"), F = n.getUniformLocation(M, "u_alpha"), I = m.x, q = m.y, V = m.x + m.width, W = m.y + m.height;
        n.bindBuffer(n.ARRAY_BUFFER, a), n.bufferSubData(
          n.ARRAY_BUFFER,
          0,
          new Float32Array([
            I,
            q,
            0,
            0,
            V,
            q,
            1,
            0,
            I,
            W,
            0,
            1,
            I,
            W,
            0,
            1,
            V,
            q,
            1,
            0,
            V,
            W,
            1,
            1
          ])
        ), n.enableVertexAttribArray(P), n.enableVertexAttribArray(_), n.vertexAttribPointer(P, 2, n.FLOAT, !1, 16, 0), n.vertexAttribPointer(_, 2, n.FLOAT, !1, 16, 8), n.uniform2f($, e.width, e.height), n.uniform1f(F, m.opacity ?? 1), n.activeTexture(n.TEXTURE0), n.bindTexture(n.TEXTURE_2D, b.texture), n.uniform1i(L, 0), n.drawArrays(n.TRIANGLES, 0, 6), d++;
      }
      return d;
    },
    dispose() {
      for (const f of o.values()) n.deleteTexture(f.texture);
      o.clear();
      for (const f of s.values()) n.deleteProgram(f);
      s.clear(), n.deleteBuffer(a), n.deleteShader(r);
    }
  };
}
function Ke(e) {
  return je(e);
}
function C(e, t, n) {
  e && (e.textContent = n, e.className = t);
}
function tt(e, t, n) {
  const i = document.createElement("div");
  return i.setAttribute("drawable", ""), i.style.cssText = [
    "position:absolute;left:28px;top:28px;width:min(320px,70%)",
    "padding:20px;border-radius:18px;box-sizing:border-box",
    "background:rgba(18,24,40,0.92);color:#eef2ff",
    "font:14px system-ui;border:1px solid rgba(255,255,255,0.14)",
    "backdrop-filter:blur(12px)"
  ].join(";"), i.innerHTML = `<strong style="display:block;font-size:17px;letter-spacing:-0.02em;margin-bottom:8px">${e}</strong>
    <p style="margin:0;opacity:0.82;line-height:1.5">${t}</p>
    ${n ? '<input data-demo-input value="Type here" aria-label="Demo input in canvas" style="width:100%;margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.16);background:rgba(0,0,0,0.28);color:inherit;font:inherit;box-sizing:border-box" />' : ""}`, i;
}
async function Ze(e, t) {
  C(t, "", "admitting HTML-in-Canvas…");
  try {
    await yt();
  } catch (s) {
    return C(t, "err", s instanceof Error ? s.message : String(s)), null;
  }
  const n = tt(
    "Surface runtime",
    "Live HTML inside a drawable canvas. Real input, real hits — no screenshot.",
    !0
  ), i = tt("exportPng()", "One clean frame → PNG.", !1);
  i.style.left = "auto", i.style.right = "28px", i.style.width = "150px", e.append(n, i);
  let r;
  try {
    r = Ae(e, { backend: "2d" });
  } catch (s) {
    return C(
      t,
      "err",
      s instanceof x ? `${s.reason}: ${s.message}` : String(s)
    ), null;
  }
  return await r.admit(), r.mount(e), r.layer(n, { id: "demo-card", drawAt: { x: 28, y: 28 }, preserveHitTestOrder: !0 }), r.layer(i, { id: "demo-chip", preserveHitTestOrder: !0 }), await r.paintOnce(), C(
    t,
    "ok",
    `host ok · backend=${r.state().backend} · paints=${r.state().metrics.paints}`
  ), { kind: "host", host: r };
}
async function Je(e, t) {
  C(t, "", "starting WebGL glass composite…");
  const n = tt(
    "Glass refraction",
    "GPU composite over captured HTML. Pointer light relights without recapture.",
    !0
  );
  e.append(n), n.setAttribute("drawable", "");
  let i;
  try {
    i = Ke(e);
  } catch (a) {
    return C(t, "err", a instanceof Error ? a.message : String(a)), null;
  }
  let r = gt(0.6, 0.4, 1.15), s = !1;
  const o = () => {
    try {
      const a = n.getBoundingClientRect();
      i.draw({
        width: e.clientWidth || 480,
        height: e.clientHeight || 280,
        layers: [
          {
            element: n,
            x: 28,
            y: 28,
            width: Math.round(a.width),
            height: Math.round(a.height),
            material: {
              kind: "glass",
              ior: 1.32,
              tint: "#c8d8ff",
              dispersion: 0.3,
              frost: 0.22
            },
            emitters: [r],
            protectedText: [{ x: 0.06, y: 0.35, width: 0.88, height: 0.55, strength: 0.88 }]
          }
        ]
      }), s = !0;
    } catch {
    }
  };
  for (let a = 0; a < 16 && !s; a++)
    o(), await new Promise((c) => setTimeout(c, 70));
  return e.addEventListener("pointermove", (a) => {
    const c = e.getBoundingClientRect();
    r = gt(
      Math.max(0, Math.min(1, (a.clientX - c.left) / c.width)),
      Math.max(0, Math.min(1, (a.clientY - c.top) / c.height)),
      1.2
    ), o(), s && C(t, "ok", "glass live · pointer light moves without recapture");
  }), s ? (C(t, "ok", "glass composite ready · move your pointer"), { kind: "glass", composite: i }) : (C(t, "err", "glass draw failed — need HTML-in-Canvas (Chrome 157+)"), null);
}
async function xt() {
  const e = document.getElementById(
    "promo-host-canvas"
  ), t = document.getElementById(
    "promo-glass-canvas"
  ), n = document.getElementById("promo-host-status"), i = document.getElementById("promo-glass-status"), r = {
    host: null,
    glass: null
  };
  e && (r.host = await Ze(e, n)), t && (r.glass = await Je(t, i)), window.__promoDemos = r;
}
typeof document < "u" && document.getElementById("promo-host-canvas") && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => {
  xt();
}) : xt());
export {
  xt as mountPromoDemos
};
