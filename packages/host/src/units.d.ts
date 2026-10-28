import type { Vec2 } from "./geometry.js";
export interface UnitState {
    canvasGrid: Vec2;
    cssSize: Vec2;
    scale: Vec2;
}
export interface UnitBridge {
    state(): UnitState;
    stop(): void;
}
/**
 * Keep canvas bitmap grid aligned with device pixels (crisp text).
 * See ACTIVATION.md "three coordinate systems".
 */
export declare function attachUnits(canvas: HTMLCanvasElement, onChange: (u: UnitState) => void): UnitBridge;
//# sourceMappingURL=units.d.ts.map