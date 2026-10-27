/**
 * M2h — shared scene packets so 2D / WebGL / WebGPU draw the same layout.
 */
import type { LayerRecord } from "../layers.js";
import { resolveOrigin } from "../layers.js";
import type { Vec2 } from "../geometry.js";
import type { Camera } from "../camera.js";
import { clipReason, depthScale, viewZ } from "../camera.js";

export interface LayerPacket {
  id: string;
  element: Element;
  /** Dest top-left in canvas-grid px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Depth scale about the vanishing point. */
  zs: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  /** Pivot in canvas-grid px (absolute). */
  pivotX: number;
  pivotY: number;
  /** Vanishing origin in canvas-grid px. */
  originX: number;
  originY: number;
  clip?: { x: number; y: number; width: number; height: number };
}

export interface SceneContext {
  layers: LayerRecord[];
  cssSize: Vec2;
  unitScale: Vec2;
  camera: Camera;
  onlyDirty: boolean;
}

export function buildLayerPackets(scene: SceneContext): LayerPacket[] {
  const { layers, cssSize, unitScale, camera, onlyDirty } = scene;
  const origin = camera.origin ?? { x: cssSize.x / 2, y: cssSize.y / 2 };
  const ox = origin.x * unitScale.x;
  const oy = origin.y * unitScale.y;
  const packets: LayerPacket[] = [];

  for (const layer of layers) {
    if (onlyDirty && !layer.dirty) continue;
    const vz = viewZ(layer.transform.z, camera);
    if (clipReason(vz, camera) !== "front") {
      layer.dirty = false;
      continue;
    }
    const el = layer.element;
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) continue;

    const rect = el.getBoundingClientRect();
    const layoutW = rect.width || el.clientWidth;
    const layoutH = rect.height || el.clientHeight;
    const destW = layoutW * unitScale.x;
    const destH = layoutH * unitScale.y;
    const x = layer.drawAt
      ? layer.drawAt.x
      : layer.transform.x * unitScale.x;
    const y = layer.drawAt
      ? layer.drawAt.y
      : layer.transform.y * unitScale.y;

    const zs = depthScale(vz, camera.perspective) ?? 1;
    const pivot = resolveOrigin(layer.origin, { x: destW, y: destH });

    packets.push({
      id: layer.id,
      element: el,
      x,
      y,
      width: destW,
      height: destH,
      zs,
      rotationDeg: layer.transform.rotation,
      scaleX: layer.transform.scaleX,
      scaleY: layer.transform.scaleY,
      opacity: layer.transform.opacity,
      pivotX: x + pivot.x,
      pivotY: y + pivot.y,
      originX: ox,
      originY: oy,
      ...(layer.clip
        ? {
            clip: {
              x: layer.clip.x * unitScale.x,
              y: layer.clip.y * unitScale.y,
              width: layer.clip.width * unitScale.x,
              height: layer.clip.height * unitScale.y,
            },
          }
        : {}),
    });
    layer.dirty = false;
  }

  return packets;
}
