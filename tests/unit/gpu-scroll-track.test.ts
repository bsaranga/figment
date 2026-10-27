import { describe, expect, it } from "vitest";
import {
  applyScrollSample,
  sampleTrack,
  scrollProgress,
  scrollTrack,
  type ScrollSample,
} from "../../packages/gpu/src/motion/scroll-track.ts";

describe("M3l scrollTrack progress + sampling", () => {
  it("computes 0..1 progress over a range", () => {
    const track = {
      source: "window" as const,
      range: { start: 100, end: 300 },
      channels: {},
    };
    expect(scrollProgress(track, 100, 800)).toBeCloseTo(0, 5);
    expect(scrollProgress(track, 200, 800)).toBeCloseTo(0.5, 5);
    expect(scrollProgress(track, 300, 800)).toBeCloseTo(1, 5);
    expect(scrollProgress(track, 50, 800)).toBe(0);
    expect(scrollProgress(track, 900, 800)).toBe(1);
  });

  it("maps progress onto channels (cameraZ / z / opacity)", () => {
    const track = {
      source: "window" as const,
      range: { start: 0, end: 1000 },
      channels: {
        cameraZ: { from: 0, to: -400 },
        z: { from: -800, to: 0 },
        opacity: { from: 0, to: 1 },
      },
    };
    const mid = sampleTrack(track, 0.5, false);
    expect(mid.progress).toBeCloseTo(0.5, 5);
    expect(mid.values.cameraZ).toBeCloseTo(-200, 5);
    expect(mid.values.z).toBeCloseTo(-400, 5);
    expect(mid.values.opacity).toBeCloseTo(0.5, 5);
  });

  it("reduced-motion static holds start; jump-end snaps", () => {
    const track = {
      source: "window" as const,
      range: { start: 0, end: 100 },
      channels: { z: { from: -100, to: 0 } },
      reducedMotion: "static" as const,
    };
    expect(sampleTrack(track, 0.8, true).values.z).toBeCloseTo(-100, 5);

    const jump = { ...track, reducedMotion: "jump-end" as const };
    expect(sampleTrack(jump, 0.2, true).values.z).toBeCloseTo(-100, 5);
    expect(sampleTrack(jump, 0.9, true).values.z).toBeCloseTo(0, 5);
  });

  it("custom easing on a channel", () => {
    const track = {
      source: "window" as const,
      range: { start: 0, end: 1 },
      channels: {
        cameraZ: { from: 0, to: 100, easing: (t: number) => t * t },
      },
    };
    const s = sampleTrack(track, 0.5, false);
    expect(s.values.cameraZ).toBeCloseTo(25, 5);
  });
});

describe("M3l scrollTrack handle", () => {
  it("update() emits samples to the sink", () => {
    const seen: ScrollSample[] = [];
    const handle = scrollTrack(
      "camera",
      {
        source: "window",
        range: { start: 0, end: 200 },
        channels: { cameraZ: { from: 0, to: -100 }, z: { from: 50, to: -50 } },
      },
      (s) => seen.push(s),
    );
    // Initial sample fires once.
    expect(seen.length).toBeGreaterThanOrEqual(1);
    const s = handle.update();
    expect(s.values.cameraZ).toBeCloseTo(0, 5);
    handle.dispose();
    expect(handle.active).toBe(false);
  });

  it("applyScrollSample routes cameraZ vs layer channels", () => {
    const calls: string[] = [];
    const sample: ScrollSample = {
      progress: 1,
      values: { cameraZ: -200, z: 40, opacity: 0.5, scale: 1.2 },
    };
    applyScrollSample("layer-1", sample, {
      setCameraZ: (z) => calls.push(`cam:${z}`),
      setLayer: (ch, v) => calls.push(`${ch}:${v}`),
    });
    expect(calls).toContain("cam:-200");
    expect(calls).toContain("z:40");
    expect(calls).toContain("opacity:0.5");
    expect(calls).toContain("scale:1.2");
    expect(calls.some((c) => c.startsWith("cameraZ"))).toBe(false);
  });
});
