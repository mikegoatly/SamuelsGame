import Phaser from 'phaser';

export const GLITCH_PIPELINE = 'GlitchFx';

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec2 uRes;
uniform float uTime;
uniform float uBurst;
uniform float uSplit;
uniform float uTear;
uniform float uScan;
varying vec2 outTexCoord;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec2 uv = outTexCoord;
  float band = floor(uv.y * 22.0);
  float tick = floor(uTime * 14.0);
  float hit = step(0.8, hash(band * 7.13 + tick));
  uv.x += hit * (hash(band + tick * 3.1) - 0.5) * 0.07 * uTear * uBurst;
  float shift = uSplit * uBurst / uRes.x;
  vec4 mid = texture2D(uMainSampler, uv);
  float r = texture2D(uMainSampler, uv + vec2(shift, 0.0)).r;
  float b = texture2D(uMainSampler, uv - vec2(shift, 0.0)).b;
  vec3 colour = vec3(r, mid.g, b);
  float row = floor(uv.y * uRes.y);
  colour *= 1.0 - uScan * step(1.5, mod(row, 3.0));
  gl_FragColor = vec4(colour, mid.a);
}
`;

/** Screen glitch: RGB split and sliding tear bands scale with `burst` (0 idle, 1 full); scanlines are always on. Plain uniforms, one texture sample trio, cheap enough for phones. */
export class GlitchPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  burst = 0;
  /** Red/blue offset in screen pixels at full burst. */
  split = 3;
  /** 1 slides the tear bands, 0 holds them still (reduced flashes). */
  tear = 1;
  scan = 0.12;
  time = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: GLITCH_PIPELINE, fragShader: FRAG });
  }

  override onPreRender(): void {
    this.set2f('uRes', this.renderer.width, this.renderer.height);
    this.set1f('uTime', this.time);
    this.set1f('uBurst', this.burst);
    this.set1f('uSplit', this.split);
    this.set1f('uTear', this.tear);
    this.set1f('uScan', this.scan);
  }
}
