/**
 * M2i — transparent clear, premultiplied bilinear sampling, analytic edge AA.
 * Shared constants for all GPU backends (no dark fringes on rotated edges).
 */
/** Edge softness in pixels (analytic AA coverage falloff). */
export declare const EDGE_AA_PX = 1.25;
/**
 * GLSL snippet: premultiplied sample × analytic edge coverage.
 * Requires: varying vec2 v_uv; uniforms sampler2D u_tex; float u_alpha; vec2 u_texel;
 */
export declare const GLSL_EDGE_AA: string;
/** WGSL equivalent for the WebGPU backend. */
export declare const WGSL_EDGE_AA: string;
//# sourceMappingURL=aa.d.ts.map