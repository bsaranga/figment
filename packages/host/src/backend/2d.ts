import type { LayerRecord } from "../layers.js";
import type { Vec2 } from "../geometry.js";

export interface Draw2DOptions {
  ctx: CanvasRenderingContext2D;
  layers: LayerRecord[];
  cssSize: Vec2;
  unitScale: Vec2;
  /** When true, skip layers that are not dirty (caller must clear damaged regions). */
  onlyDirty: boolean;
}

/**
 * 2D backend: drawElementImage with CSS→canvas-grid scaling.
 * Geometry: 2D auto-syncs hits when preserveElementGeometry is false (default).
 */
export function drawLayers2D(opts: Draw2DOptions): number {
  const { ctx, layers, cssSize, unitScale, onlyDirty } = opts;
  let drawn = 0;

  for (const layer of layers) {
    if (onlyDirty && !layer.dirty) continue;
    const el = layer.element;
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) {
      continue;
    }

    const rect = el.getBoundingClientRect();
    // dest size in canvas-grid px
    const destW = layer.drawAt
      ? undefined
      : (rect.width || el.clientWidth) * unitScale.x;
    const destH = layer.drawAt
      ? undefined
      : (rect.height || el.clientHeight) * unitScale.y;

    const dx = layer.drawAt
      ? layer.drawAt.x
      : (layer.transform.x + (rect.left - cssOriginLeft(el))) * unitScale.x;
    const dy = layer.drawAt
      ? layer.drawAt.y
      : (layer.transform.y + (rect.top - cssOriginTop(el))) * unitScale.y;

    ctx.save();
    if (layer.transform.opacity !== 1) {
      ctx.globalAlpha = Math.min(1, Math.max(0, layer.transform.opacity));
    }

    // rotation about origin
    if (layer.transform.rotation !== 0 || layer.transform.scaleX !== 1 || layer.transform.scaleY !== 1) {
      const originX = dx + (destW ?? 0) / 2;
      const originY = dy + (destH ?? 0) / 2;
      ctx.translate(originX, originY);
      ctx.rotate((layer.transform.rotation * Math.PI) / 180);
      ctx.scale(layer.transform.scaleX, layer.transform.scaleY);
      ctx.translate(-originX, -originY);
    }

    // Must stay a method call on ctx — detaching drawElementImage loses `this`.
    type Drawable2D = CanvasRenderingContext2D & {
      drawElementImage: (el: Element, ...rest: number[]) => unknown;
    };

    if (destW !== undefined && destH !== undefined && (destW !== rect.width * unitScale.x || destH !== rect.height * unitScale.y)) {
      // explicit dest box
      (ctx as Drawable2D).drawElementImage(el, dx, dy, destW, destH);
    } else {
      (ctx as Drawable2D).drawElementImage(el, dx, dy);
    }

    ctx.restore();
    layer.dirty = false;
    drawn += 1;
  }

  return drawn;
}

function cssOriginLeft(_el: Element): number {
  // Layer transforms are relative to the layer's own layout box; drawElementImage
  // places the border-box at (dx,dy). We use drawAt or transform as the dest origin.
  return 0;
}

function cssOriginTop(_el: Element): number {
  return 0;
}
