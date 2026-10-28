/**
 * M2i — transparent clear, premultiplied bilinear sampling, analytic edge AA.
 * Shared constants for all GPU backends (no dark fringes on rotated edges).
 */
/** Edge softness in pixels (analytic AA coverage falloff). */
export const EDGE_AA_PX = 1.25;
/**
 * GLSL snippet: premultiplied sample × analytic edge coverage.
 * Requires: varying vec2 v_uv; uniforms sampler2D u_tex; float u_alpha; vec2 u_texel;
 */
export const GLSL_EDGE_AA = `
float figmentEdgeAA(vec2 uv, vec2 texel) {
  // Distance to the nearest UV edge in texels (quad border).
  vec2 d = min(uv, vec2(1.0) - uv) / max(texel, vec2(1e-6));
  float dist = min(d.x, d.y);
  float w = ${EDGE_AA_PX.toFixed(2)};
  return smoothstep(0.0, w, dist);
}

vec4 figmentSamplePremul(sampler2D tex, vec2 uv, vec2 texel, float alpha) {
  vec4 c = texture2D(tex, uv);
  // Textures are uploaded premultiplied; filter stays linear (bilinear premul).
  float aa = figmentEdgeAA(uv, texel);
  return vec4(c.rgb * alpha * aa, c.a * alpha * aa);
}
`;
/** WGSL equivalent for the WebGPU backend. */
export const WGSL_EDGE_AA = `
fn figmentEdgeAA(uv: vec2f, texel: vec2f) -> f32 {
  let d = min(uv, vec2f(1.0, 1.0) - uv) / max(texel, vec2f(1e-6, 1e-6));
  let dist = min(d.x, d.y);
  return smoothstep(0.0, ${EDGE_AA_PX.toFixed(2)}, dist);
}

fn figmentSamplePremul(tex: texture_2d<f32>, samp: sampler, uv: vec2f, texel: vec2f, alpha: f32) -> vec4f {
  let c = textureSample(tex, samp, uv);
  let aa = figmentEdgeAA(uv, texel);
  return vec4f(c.rgb * alpha * aa, c.a * alpha * aa);
}
`;
//# sourceMappingURL=aa.js.map