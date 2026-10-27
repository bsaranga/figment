# figment

**Full stack for canvas-native apps:** surface runtime + GPU framework (effects, materials, lights, tilt) + spatial UI kit. Real DOM from any front-end framework. Interactive and accessible. Chrome HTML-in-Canvas OT only — **no fallback**.

**Promo:** [bsaranga.github.io/figment](https://bsaranga.github.io/figment/)

## Status

Research / proposal phase. See [PROPOSAL.md](./PROPOSAL.md) before any implementation.

## Docs

- [GOALS.md](./GOALS.md) — **north star**: cool capabilities, hero demos, Awwwards craft bar, success criteria
- [EXEC_SUMMARY.md](./EXEC_SUMMARY.md) — **start here** (plain-language product + architecture)
- [ACTIVATION.md](./ACTIVATION.md) — **Chrome flags / Origin Trial + known shortcomings**
- [ARCHITECTURE.md](./ARCHITECTURE.md) — packages, APIs, modules, data flow, error model
- [PLAN.md](./PLAN.md) — **milestones, task breakdown, TODO-graph**
- [PROPOSAL.md](./PROPOSAL.md) — thesis, validated API surface, competitor map, usefulness ranking, risks
- [FEATURES.md](./FEATURES.md) — **competitive steal list** from Underglass + Prism (feature matrix, P0–P3, reject list)

## Locked decisions

- Tilt / projective panels: **in scope** (admission-probed)
- Scroll-into-screen Z-space (`transform.z` + shared camera + `scrollTrack`): **required** — teams must be able to build depth story sites
- Missing API: throw `FigmentUnsupportedError` — **no fallback**
- Kit distribution: deferred

## Constraint

**No fallback.** Target HTML-in-Canvas only (Chrome Canary/Dev + origin trial). See PROPOSAL.md §4.3.
