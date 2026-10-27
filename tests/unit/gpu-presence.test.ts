import { describe, expect, it } from "vitest";
import {
  DISSOLVE_EXIT,
  presence,
  startMotionLoop,
} from "../../packages/gpu/src/index.ts";

describe("M3j presence", () => {
  it("starts hidden and enters to visible", async () => {
    const p = presence(null, { present: false });
    expect(p.phase).toBe("hidden");
    expect(p.present).toBe(false);

    const enter = p.setPresent(true);
    expect(p.phase).toBe("entering");
    expect(enter).not.toBeNull();
    expect(p.animating).toBe(true);

    await p.done;
    expect(p.phase).toBe("visible");
    expect(p.value().opacity).toBeCloseTo(1, 3);
  });

  it("exits to hidden with dissolve (toast)", async () => {
    const p = presence(null, {
      present: true,
      exit: DISSOLVE_EXIT,
    });
    // Constructor kicks enter when present:true
    await p.done;
    expect(p.phase).toBe("visible");

    p.setPresent(false);
    expect(p.phase).toBe("exiting");
    await p.done;
    expect(p.phase).toBe("hidden");
    expect(p.value().opacity).toBeCloseTo(0, 3);
  });

  it("retargeting mid-enter runs a clean exit", async () => {
    const p = presence(null, {
      present: false,
      enter: { duration: 200, easing: "linear", to: { opacity: 1 } },
      exit: { duration: 40, easing: "linear", to: { opacity: 0 } },
    });
    p.setPresent(true);
    await new Promise((r) => setTimeout(r, 30));
    p.setPresent(false);
    await p.done;
    expect(p.phase).toBe("hidden");
    expect(p.value().opacity).toBeCloseTo(0, 3);
  });

  it("exposes loop for manual stepping if needed", () => {
    const p = presence(null, { present: false });
    const h = p.setPresent(true);
    expect(h).not.toBeNull();
    const off = startMotionLoop(h ? [h] : []);
    off();
  });
});
