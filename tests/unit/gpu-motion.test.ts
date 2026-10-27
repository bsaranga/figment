import { describe, expect, it } from "vitest";
import {
  ease,
  sampleMotion,
  startMotionLoop,
  transition,
  transitionGroup,
  IDENTITY_FRAME,
} from "../../packages/gpu/src/motion/transition.ts";

describe("M3i motion sample + easing", () => {
  it("lerps channels and eases progress", () => {
    const mid = sampleMotion(
      IDENTITY_FRAME,
      { x: 100, opacity: 0 },
      0.5,
      "linear",
    );
    expect(mid.x).toBeCloseTo(50, 5);
    expect(mid.opacity).toBeCloseTo(0.5, 5);

    expect(ease("linear", 0.5)).toBeCloseTo(0.5, 5);
    expect(ease("ease-in", 0.5)).toBeLessThan(0.5);
    expect(ease("ease-out", 0.5)).toBeGreaterThan(0.5);
    expect(ease("ease-in-out", 0)).toBe(0);
    expect(ease("ease-in-out", 1)).toBeCloseTo(1, 5);
  });
});

describe("M3i transition / transitionGroup", () => {
  it("runs a transition to its end frame", async () => {
    const h = transition("layer", {
      duration: 40,
      easing: "linear",
      to: { x: 80, opacity: 0.25 },
    });
    expect(h.running).toBe(true);

    await new Promise<void>((resolve) => {
      const off = startMotionLoop([h], () => {
        if (!h.running) {
          off();
          resolve();
        }
      });
    });

    await h.done;
    const v = h.value();
    expect(v.x).toBeCloseTo(80, 5);
    expect(v.opacity).toBeCloseTo(0.25, 5);
    expect(h.running).toBe(false);
  });

  it("stagger delays group starts", async () => {
    const group = transitionGroup(
      [
        { layerId: "a", desc: { duration: 30, easing: "linear", to: { x: 10 } } },
        { layerId: "b", desc: { duration: 30, easing: "linear", to: { x: 10 } } },
        { layerId: "c", desc: { duration: 30, easing: "linear", to: { x: 10 } } },
      ],
      20,
    );
    expect(group).toHaveLength(3);

    const off = startMotionLoop(group, () => {});
    // Mid-flight: first has started, third has not (stagger 20ms × 2).
    await new Promise((r) => setTimeout(r, 35));
    const a = group[0]!.value();
    const c = group[2]!.value();
    expect(a.x).toBeGreaterThan(0);
    expect(c.x).toBeCloseTo(0, 5);

    await new Promise<void>((resolve) => {
      const done = () => {
        if (group.every((h) => !h.running)) {
          off();
          resolve();
        } else {
          setTimeout(done, 10);
        }
      };
      done();
    });
    expect(group[2]!.value().x).toBeCloseTo(10, 5);
  });

  it("stop() freezes at current value", async () => {
    const h = transition("l", {
      duration: 200,
      easing: "linear",
      to: { x: 100 },
    });
    const off = startMotionLoop([h]);
    await new Promise((r) => setTimeout(r, 50));
    h.stop();
    const frozen = h.value().x;
    expect(frozen).toBeGreaterThan(0);
    expect(frozen).toBeLessThan(100);
    off();
    await h.done;
  });

  it("finish() jumps to the end", () => {
    const h = transition("l", {
      duration: 500,
      to: { y: 40, rotation: 90 },
    });
    h.finish();
    const v = h.value();
    expect(v.y).toBeCloseTo(40, 5);
    expect(v.rotation).toBeCloseTo(90, 5);
    expect(h.running).toBe(false);
  });
});
