import Phaser from 'phaser';

// ---- Old-TV fragment shader (rectangular vignette, no rounded corners) ----
const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

uniform vec2  uResolution;
uniform float uTime;

uniform float uCurvature;
uniform float uNoiseAmount;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uFlickerIntensity;
uniform float uRollSpeed;
uniform float uBleed;
uniform float uLineJitter;
uniform float uJitterFreq;
uniform float uContrast;
uniform float uGamma;
uniform float uVignetteIntensity;   // rectangular edge fade amount
uniform float uVignetteSoftness;
uniform float uBloomThreshold;
uniform float uBloomAmount;

float rand(vec2 x){ return fract(sin(dot(x,vec2(12.9898,78.233))) * 43758.5453); }

vec2 barrel(vec2 uv, float k){
  vec2 cc = uv*2.0 - 1.0;
  float r2 = dot(cc,cc);
  cc *= (1.0 + k*r2);
  return cc*0.5 + 0.5;
}

float sampleGray(vec2 uv){
  return dot(texture2D(uMainSampler, uv).rgb, vec3(0.299,0.587,0.114));
}

void main(){
  vec2 uv = outTexCoord;
  vec2 px = 1.0 / uResolution;

  if (uCurvature > 0.0) { uv = barrel(uv, uCurvature); }

  float line = floor(uv.y * uResolution.y / max(uJitterFreq, 1.0));
  float jitter = uLineJitter * (rand(vec2(uTime, line)) - 0.5);
  uv.x += jitter * 0.003;

  vec3 base = texture2D(uMainSampler, uv).rgb * 0.6
            + texture2D(uMainSampler, uv + vec2(px.x,0.0)).rgb * (0.2 * uBleed)
            + texture2D(uMainSampler, uv - vec2(px.x,0.0)).rgb * (0.2 * uBleed);

  float g = dot(base, vec3(0.299,0.587,0.114));

  float b = 0.0;
  b += sampleGray(uv);
  b += sampleGray(uv + vec2(+px.x,0.0));
  b += sampleGray(uv + vec2(-px.x,0.0));
  b += sampleGray(uv + vec2(0.0,+px.y));
  b += sampleGray(uv + vec2(0.0,-px.y));
  b += sampleGray(uv + vec2(+px.x,+px.y));
  b += sampleGray(uv + vec2(-px.x,+px.y));
  b += sampleGray(uv + vec2(+px.x,-px.y));
  b += sampleGray(uv + vec2(-px.x,-px.y));
  b /= 9.0;
  float bloom = max(0.0, b - uBloomThreshold) * uBloomAmount;

  float scan = sin((uv.y + uTime * 0.02) * uScanlineCount * 3.14159265);
  float scanMask = 1.0 - uScanlineIntensity * (0.5 + 0.5 * scan);

  float n = rand(uv * uResolution + uTime * 50.0) - 0.5;
  float grain = 1.0 + uNoiseAmount * n;
  float flicker = 1.0 + uFlickerIntensity * (sin(uTime * 120.0) * 0.5 + 0.5);

  float rollBand = 0.0;
  if (uRollSpeed > 0.0){
    float roll = fract(uTime * uRollSpeed);
    rollBand = exp(-pow((uv.y - roll)*3.0, 2.0)) * 0.12;
  }

  // rectangular edge fade (no rounded-corner look)
  float vx = smoothstep(0.0, uVignetteSoftness, uv.x) * smoothstep(0.0, uVignetteSoftness, 1.0 - uv.x);
  float vy = smoothstep(0.0, uVignetteSoftness, uv.y) * smoothstep(0.0, uVignetteSoftness, 1.0 - uv.y);
  float edge = min(vx, vy);
  float vig = mix(1.0, edge, uVignetteIntensity);

  float bw = g;
  bw = mix(0.5, bw, uContrast);
  bw = pow(clamp(bw, 0.0, 1.0), uGamma);

  float outLum = (bw + bloom + rollBand);
  outLum *= scanMask * grain * flicker * vig;

  gl_FragColor = vec4(vec3(clamp(outLum,0.0,1.0)), 1.0);
}
`;

export default class OldTVPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, renderTarget: true, fragShader: FRAG });

    // defaults (tweak any time)
    this.curvature = 0.00;          // keep flat by default
    this.noiseAmount = 0.08;        // moving grain
    this.scanlineIntensity = 0.22;  // scanlines
    this.scanlineCount = 900.0;     // ~ vertical resolution
    this.flicker = 0.02;
    this.rollSpeed = 0.00;          // set >0 for vertical roll band
    this.bleed = 0.55;
    this.lineJitter = 0.12;
    this.jitterFreq = 90.0;
    this.contrast = 1.20;
    this.gamma = 0.95;
    this.vignetteIntensity = 0.00;  // 0 = no edge fade
    this.vignetteSoftness = 0.20;
    this.bloomThreshold = 0.60;
    this.bloomAmount = 0.20;
  }

  onPreRender () {
    const w = this.game.scale.width;
    const h = this.game.scale.height;
    this.set2f('uResolution', w, h);
    this.set1f('uTime', this.game.loop.now / 1000);

    this.set1f('uCurvature', this.curvature);
    this.set1f('uNoiseAmount', this.noiseAmount);
    this.set1f('uScanlineIntensity', this.scanlineIntensity);
    this.set1f('uScanlineCount', this.scanlineCount);
    this.set1f('uFlickerIntensity', this.flicker);
    this.set1f('uRollSpeed', this.rollSpeed);
    this.set1f('uBleed', this.bleed);
    this.set1f('uLineJitter', this.lineJitter);
    this.set1f('uJitterFreq', this.jitterFreq);
    this.set1f('uContrast', this.contrast);
    this.set1f('uGamma', this.gamma);
    this.set1f('uVignetteIntensity', this.vignetteIntensity);
    this.set1f('uVignetteSoftness', this.vignetteSoftness);
    this.set1f('uBloomThreshold', this.bloomThreshold);
    this.set1f('uBloomAmount', this.bloomAmount);
  }
}
