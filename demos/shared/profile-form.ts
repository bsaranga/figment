/**
 * Shared profile-form fixture so vanilla and React demos paint the same pixels.
 * M1l parity depends on this staying the single source of form markup + styles.
 */

export const FORM_ID = "profile";

export const FORM_STYLE = [
  "display:flex",
  "flex-direction:column",
  "gap:10px",
  "width:280px",
  "padding:16px",
  "background:#1b2230",
  "color:#e8ecf4",
  "border-radius:12px",
  "font:14px system-ui",
  "box-sizing:border-box",
].join(";");

export const FORM_HTML = `
  <strong>Profile</strong>
  <label>Name <input name="name" value="Ada" data-testid="name" style="width:100%" /></label>
  <label>Bio <textarea name="bio" rows="2" data-testid="bio" style="width:100%">Hello</textarea></label>
  <button type="submit" data-testid="save">Save</button>
  <output data-testid="out"></output>
`;

export const NESTED_CANVAS_STYLE =
  "width:80px;height:40px;background:#c23f53;border-radius:6px";

/** Nested canvas exercises M1c mark/restore; matches vanilla-mount. */
export function attachNestedCanvas(form: HTMLElement): HTMLCanvasElement {
  const nested = document.createElement("canvas");
  nested.width = 80;
  nested.height = 40;
  nested.style.cssText = NESTED_CANVAS_STYLE;
  form.append(nested);
  return nested;
}

/** Layer enrollment shared by both demos (identical draw box). */
export const PROFILE_LAYER_OPTS = {
  id: "profile",
  transform: { x: 24, y: 24 },
  drawAt: { x: 24, y: 24 },
} as const;
