/** GLSL snippets for shader components, placed before a fragment's own code: fragment: NOISE + code.
 *  Import only what a shader uses, since each one adds to the component's size. Both rely on the prelude
 *  in lib/gl.ts. */

/** Seeded gradient noise in 2D, after Perlin's "Improving Noise" (2002), with a quintic fade:
 *  pica_noise(p) in about -1 to 1, and pica_fbm(p, octaves), a fractal sum of up to 8 octaves. */
export const NOISE = `
vec2 pica_gradient(ivec2 cell) {
  uint h = pica_hash(uvec2(cell) + uvec2(uint(u_seed) * 2654435761u, uint(u_seed)));
  float a = float(h) * 1.4629180792671596e-9;
  return vec2(cos(a), sin(a));
}
float pica_noise(vec2 p) {
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(pica_gradient(i), f);
  float b = dot(pica_gradient(i + ivec2(1, 0)), f - vec2(1.0, 0.0));
  float c = dot(pica_gradient(i + ivec2(0, 1)), f - vec2(0.0, 1.0));
  float d = dot(pica_gradient(i + ivec2(1, 1)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.41421356;
}
float pica_fbm(vec2 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * pica_noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum;
}
`;

/** The tail every shader repeats: take a tone from 0 to 1, quantize it through the Bayer matrix into a
 *  number of steps, and composite that much ink over the ground. Needs DITHER before it.
 *
 *  The result is straight alpha, which is what lib/gl.ts asks the context for. Mixing toward u_bg instead
 *  would be premultiplied whenever the ground is transparent, which is the default, and the browser would
 *  then multiply by alpha a second time: every mid-tone would come out squared, so six even levels would
 *  land near 7, 19, 38, 65 and 100 percent instead of 20 through 100. */
export const TONE = `
vec4 pica_tone(float tone, vec4 ink, float levels) {
  float steps = max(1.0, levels);
  float q = floor(clamp(tone, 0.0, 1.0) * steps + pica_bayer8(ivec2(gl_FragCoord.xy))) / steps;
  float amount = clamp(q, 0.0, 1.0) * ink.a;
  float onto = u_bg.a * (1.0 - amount);
  float alpha = amount + onto;
  return vec4((ink.rgb * amount + u_bg.rgb * onto) / max(alpha, 0.0001), alpha);
}
`;

/** The 8 by 8 Bayer threshold at a pixel, in (0, 1), for ordered dithering:
 *  step(pica_bayer8(ivec2(gl_FragCoord.xy)), tone). The same matrix as bayerMatrix(8) in lib/dither.ts. */
export const DITHER = `
float pica_bayer8(ivec2 p) {
  int x = p.x & 7;
  int y = p.y & 7;
  int a = x ^ y;
  int v = ((a & 1) << 5) | ((y & 1) << 4) | ((a & 2) << 2) | ((y & 2) << 1) | ((a & 4) >> 1) | ((y & 4) >> 2);
  return (float(v) + 0.5) / 64.0;
}
`;
