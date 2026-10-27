# figment — North Star

**What becomes possible when the full stack ships.** These are the target goals that rank work, settle scope fights, and define “done” for the product — not a feature checklist.

**Stack:** surface runtime (`host`) + GPU framework (`gpu`) + spatial UI kit (`ui`) + any-FE integration · Chrome HTML-in-Canvas · **no fallback**.

---

## The one-sentence north star

> **Any front-end team can ship a GPU-composited, spatial application UI — glass, light, tilt, infinite canvas — using the HTML they already write, without losing clicks, forms, or screen readers.**

**Quality bar (Awwwards SOTY/SOTD, 2020–2026):** if the result could not stand next to Lando Norris, Messenger, Igloo Inc, or Lusion v3 on the same stage, it is not done. Design craft first (Awwwards weights Design 40%), then Creativity 20% / Usability 30% / Content 10% — and a Developer Award pass (animation, a11y, WPO) because every modern winner carries one.

---

## 1. Capability goals (the cool things)

### 1.1 DOM is a GPU material
| Goal | Why it matters |
|---|---|
| Live HTML as a texture in 2D / WebGL / WebGPU | Effects, 3D, and compositing without screenshot hacks |
| **Glass command palette** — real `<input>`, refraction on top | Looks like a AAA overlay; still types, focuses, IMEs |
| **Lit spatial panels** — emitters/pointer light on real forms | Dashboards and tools that feel physical |
| **Dissolve / ripple / chromatic** on chrome (toasts, dialogs) | Motion that CSS cannot express — safely (decorative/inert contracts) |
| **Custom `defineEffect` shaders** on app UI | Teams ship proprietary looks without forking the kit |

### 1.2 Spatial / infinite UI
| Goal | Why it matters |
|---|---|
| **Infinite canvas shell** (pan/zoom) with HTML widgets in world space | Figma/Miro-class tools without a custom renderer |
| **Tilted / projective panels** with correct hit-testing | Cards in 3D space that still receive clicks |
| **Scroll-into-screen Z-space** — scroll drives a camera through depth; panels fly toward/past the viewer | The Awwwards/Apple story-site pattern (Lusion, cinematic product pages) on real HTML |
| **Layer stack + minimap + depth** | Navigation in large scenes |
| **World-space HUD** in games (accessible) | First game UI screen readers can actually use |

### 1.3 Product chrome that scales
| Goal | Why it matters |
|---|---|
| Command palette (⌘K), modal, toast, context menu, tooltip | Every spatial app needs these; kit ships them |
| **Virtualized lists/grids** on canvas | 10k-row inspectors at 60fps |
| Form controls with native semantics | Keyboard, IME, validation, a11y free |

### 1.4 Any framework, today
| Goal | Why it matters |
|---|---|
| Mount React / Vue / Svelte / Angular / HTMX / vanilla DOM unchanged | No custom reconciler; state management untouched |
| Web Components kit | One design system in every stack |
| Optional thin bindings | Ergonomics without lock-in |
| Interop guarantee: events, focus, forms, IME, AT | The a11y moat |

### 1.5 Export & workflow
| Goal | Why it matters |
|---|---|
| `paintOnce()` → PNG / video frames | OG images, docs, marketing from live UI |
| Design-tool and agent-workspace verticals | Proves the stack end-to-end |
| Agent skill (`figment-runtime`) | AI assistants install and wire components correctly |

---

## 2. Demo north stars (what we point at)

These are the **hero demos** we optimize for. If a demo looks amazing and stays interactive + accessible, the architecture is right.

| Demo | Shows | Awwwards twin to long for |
|---|---|---|
| **Spatial whiteboard** | Infinite canvas, tilt panels, minimap, virtualized layers | Lusion / agency folios — scroll & cursor as material |
| **Z-scroll story** | Scroll-scrubbed camera in Z; HTML panels approach, pass, and exit with correct hits + AT | Apple / SOTY cinematic scroll — content lives in depth, not a page |
| **Glass HUD game** | World-space HTML HUD, emitters, protected text, keyboard/AT | Messenger — playable world, characters, NPC UI |
| **Agent workspace** | Floating tool panels, command palette, dissolve toasts, any-FE mount | Igloo / product worlds — chrome that feels physical |
| **Live design surface** | Export PNG/video from the same scene; defineEffect art direction | Lando Norris / editorial SOTDs — bold type, restraint, motion identity |

---

## 2.5 Craft ideals to long for (Awwwards state of the art)

Pulled from Sites of the Day / Year (Lando Norris, Messenger, Igloo Inc, Lusion v3, OFFFForum, Opal Tadpole, Noomo) and Awwwards’ scoring axes. These are **aspirational qualities**, not a feature checklist — they set the bar demos must clear.

| Ideal | What it looks like on winners | figment implication |
|---|---|---|
| **Design as score #1** | Typography is the interface; 1–2 color palettes; confident negative space; every pixel intentional | Kit type scale, color tokens, and layout defaults must look art-directed out of the box — not “framework gray” |
| **Creativity is the differentiator** | Novel metaphors (character navigation, NPC UIs, living schedules) win over generic parallax | Ship primitives that invent new interaction forms (tilt panels, refraction palette, world-space HUD) — not just style existing ones |
| **Motion is language** | Scroll choreography, reactive cursors, staggered presence, cinematic transitions | First-class `Presence`/stagger/scroll-driven GPU motion; no “CSS fade” as the ceiling |
| **Scroll is a camera** | Depth fly-throughs, pinned Z stages, content emerging from the vanishing point | Scroll progress → camera Z / layer Z is a first-class API (`scrollTrack`), not app-side hacks |
| **World-building** | Brands become places: planets, rooms, infinite agency stages | Infinite canvas + depth + minimap is our spatial storytelling substrate |
| **Playable product surfaces** | Configurators, live schedules, interactive characters as the product | Agent workspace + whiteboard demos must feel *inhabited*, not static mockups |
| **Material & light** | Glass, refraction, glow, physical chrome (Igloo-class) | `defineEffect` + lit panels are the signature look — decorative/inert contracts stay |
| **Restraint over fireworks** | Winning sites use a tight palette and one strong idea; noise loses | Reject busy shader soup; one coherent art direction per demo |
| **Dev craft is table stakes** | Every SOTD also wins Developer Award (animations, semantics, a11y, WPO) | 60fps, crisp text, working AT, fast first paint are success criteria — not polish later |
| **Content with voice** | Copy is part of the experience (Messenger’s planet line, bold editorial) | Demos ship with real product narrative, not lorem |

**Long-for quality test:** would a jury score the demo ≥8 Design, ≥8 Creativity, with Dev Award ≥7.5 on animation + accessibility? If not, keep iterating.

---

## 3. Non-goals (north-star guardrails)

- Hero-section fireworks as the product (CanvasUI’s lane)
- Engine-specific texture bridges as core (Three/Pabylon/Pixi are adapters later)
- Old-browser fallbacks / polyfills / placeholders
- SSR / hydration in v1
- Owning the user’s component framework

---

## 4. Success criteria (how we know we hit the star)

1. **Interactive** — native forms and focus work inside every demo (no canvas-only controls).
2. **Accessible** — keyboard and one screen reader pass on the kit chrome.
3. **Crisp** — text matches DOM at DPR 1 and 2 (no unit blur).
4. **Correct hits** — tilted/overlapping panels click what they look like they click.
5. **Portable** — same kit demo in React + Svelte + vanilla with pixel/hit parity.
6. **Fail-fast** — wrong browser throws `FigmentUnsupportedError`; never a broken UI.
7. **Award-caliber** — §2.5 craft ideals hold: Design/Creativity at SOTY level, Dev Award axes (animation, a11y, WPO, semantics) not sacrificed for looks.
8. **Z-depth stories** — scroll-into-screen works: camera/panels move in Z under native scroll; forms still focus; hits match what’s on screen; `prefers-reduced-motion` respected.

---

## 5. How we use this document

- Rank P0–P3 work in [FEATURES.md](./FEATURES.md) against these goals.
- Reject scope that does not serve a demo in §2 or a criterion in §4.
- When tradeoffs appear (perf vs fidelity, kit vs runtime), pick the option that preserves §4.
- Use §2.5 as the **taste bar**: if a visual/motion choice would lose an Awwwards jury on Design or Creativity, choose a better one — without breaking Interop/AT.
