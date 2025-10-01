// src/game/pipelines/OldTVPipeline.js
import Phaser from 'phaser';

const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

uniform vec2  uResolution;
uniform float uTime;

uniform float uCurvature;
uniform float uScanlineIntensity;
uniform float uScanlineCount;
uniform float uFlickerIntensity;
uniform float uRollSpeed;
uniform float uBleed;
uniform float uLineJitter;
uniform float uJitterFreq;
uniform float uContrast;
uniform float uGamma;
uniform float uVignetteIntensity;
uniform float uVignetteSoftness;
uniform float uBloomThreshold;
uniform float uBloomAmount;

/* new: grain + glitch controls */
uniform float uGrainAmount;   // 0..1  (how strong)
uniform float uGrainScale;    // e.g. 1..6 (grain size; bigger = coarser)
uniform float uGrainVX;       // grain scroll speed in X (px/s)
uniform float uGrainVY;       // grain scroll speed in Y (px/s)
uniform float uGlitchStrength;// 0..1 baseline glitch strength
uniform float uGlitchFrequency;// glitches per second (0 = never)
uniform float uDropoutIntensity;// 0..1 chance/intensity of horizontal dropouts
uniform float uBlockiness;    // pixelation amount inside glitch band (0..1)
uniform float uGlitchForce;   // manual “burst” (0..1), can be set from JS

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
  vec2 res = uResolution;
  vec2 px  = 1.0 / res;

  // --- CRT curvature ---
  if (uCurvature > 0.0) {
    uv = barrel(uv, uCurvature);
  }

  // --- per-line horizontal jitter ---
  float line = floor(uv.y * res.y / max(uJitterFreq, 1.0));
  float jitter = uLineJitter * (rand(vec2(uTime, line)) - 0.5);
  uv.x += jitter * 0.003;

  // --- phosphor bleed (3 taps) ---
  vec3 base = texture2D(uMainSampler, uv).rgb * 0.6
            + texture2D(uMainSampler, uv + vec2(px.x,0.0)).rgb * (0.2 * uBleed)
            + texture2D(uMainSampler, uv - vec2(px.x,0.0)).rgb * (0.2 * uBleed);

  // --- grayscale ---
  float g = dot(base, vec3(0.299,0.587,0.114));

  // --- local halation/bloom (9 taps) ---
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

  // --- animated scanlines ---
  float scan = sin((uv.y + uTime * 0.02) * uScanlineCount * 3.14159265);
  float scanMask = 1.0 - uScanlineIntensity * (0.5 + 0.5 * scan);

  // --- flicker ---
  float flicker = 1.0 + uFlickerIntensity * (sin(uTime * 120.0) * 0.5 + 0.5);

  // --- MOVING GRAIN (film-like) ---
  // Grain coordinates scroll across the screen; uGrainScale controls size.
  vec2 grainUV = (uv * (res / max(uGrainScale, 0.0001))) +
                 vec2(uTime * uGrainVX, uTime * uGrainVY);
  float grain = rand(grainUV) * 2.0 - 1.0;  // [-1..1]
  float grainMul = 1.0 + uGrainAmount * grain;

  // --- GLITCH SCHEDULER ---
  float gfreq = max(uGlitchFrequency, 0.0);
  float phase = floor(uTime * gfreq + 0.0001);
  float rOccur = rand(vec2(phase, 7.31));
  // 15% chance per window; bell-shaped window across each interval
  float occur = step(0.85, rOccur);
  float w = fract(uTime * gfreq);
  float window = smoothstep(0.05, 0.25, w) * smoothstep(1.0, 0.75, w);
  float gstr = max(uGlitchStrength * occur * window, uGlitchForce);

  // --- GLITCH EFFECTS ---
  // 1) Horizontal shear band
  float bandC = rand(vec2(phase, 3.7));
  float bandH = mix(0.02, 0.15, rand(vec2(phase, 1.7)));
  float inBand = smoothstep(bandC - bandH, bandC, uv.y) *
                 (1.0 - smoothstep(bandC, bandC + bandH, uv.y));
  float shear = (rand(vec2(phase, 5.1)) - 0.5) * 0.05; // max ~5% screen width
  uv.x += inBand * gstr * shear;

  // 2) Blocky pixelation inside band
  float block = mix(1.0, 8.0, clamp(uBlockiness * gstr, 0.0, 1.0)); // 1=off, 8=chunky
  vec2 mosaicUV = floor(uv * res / block) * block / res;

  // 3) Vertical desync (small jump)
  uv.y += gstr * (rand(vec2(phase, 9.1)) - 0.5) * 0.01;

  // Sample again after glitch displacement (blockiness only inside band)
  vec2 glitchedUV = mix(uv, mosaicUV, inBand * gstr);
  float g2 = dot(texture2D(uMainSampler, glitchedUV).rgb, vec3(0.299,0.587,0.114));

  // --- horizontal dropouts (random bright/dark lines during glitch) ---
  float dropout = 0.0;
  if (uDropoutIntensity > 0.0) {
    float rowRnd = rand(vec2(floor(glitchedUV.y * res.y), phase));
    dropout = step(1.0 - uDropoutIntensity * gstr, rowRnd);
  }

  // --- tone + rectangular vignette (no rounded TV corners) ---
  float bw = g2;
  bw = mix(0.5, bw, uContrast);
  bw = pow(clamp(bw, 0.0, 1.0), uGamma);

  // rectangular edge fade
  float vx = smoothstep(0.0, uVignetteSoftness, glitchedUV.x) * smoothstep(0.0, uVignetteSoftness, 1.0 - glitchedUV.x);
  float vy = smoothstep(0.0, uVignetteSoftness, glitchedUV.y) * smoothstep(0.0, uVignetteSoftness, 1.0 - glitchedUV.y);
  float edge = min(vx, vy);
  float vig = mix(1.0, edge, uVignetteIntensity);

  // rolling bright band (optional)
  float rollBand = 0.0;
  if (uRollSpeed > 0.0){
    float roll = fract(uTime * uRollSpeed);
    rollBand = exp(-pow((glitchedUV.y - roll)*3.0, 2.0)) * 0.12;
  }

  // Compose
  float outLum = (bw + bloom + rollBand);
  outLum *= scanMask * flicker * grainMul * vig;

  // apply dropout as quick brighten/darken lines
  outLum = mix(outLum, outLum * 0.3, dropout);           // dark dropout
  outLum = mix(outLum, min(1.0, outLum + 0.25), dropout * 0.3); // occasional bright

  gl_FragColor = vec4(vec3(clamp(outLum, 0.0, 1.0)), 1.0);
}
`;

export default class OldTVPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, renderTarget: true, fragShader: FRAG });

    // previous knobs
    this.curvature = 0.00;
    this.scanlineIntensity = 0.22;
    this.scanlineCount = 900.0;
    this.flicker = 0.02;
    this.rollSpeed = 0.00;
    this.bleed = 0.55;
    this.lineJitter = 0.16;
    this.jitterFreq = 100.0;
    this.contrast = 1.20;
    this.gamma = 0.95;
    this.vignetteIntensity = 0.00; // keep flat box look
    this.vignetteSoftness = 0.20;
    this.bloomThreshold = 0.60;
    this.bloomAmount = 0.20;

    // NEW: grain + glitch defaults
    this.grainAmount = 0.18;  // stronger film grain
    this.grainScale  = 2.5;   // bigger = chunkier grain
    this.grainVX     = 55.0;  // px/s horizontally (scrolling)
    this.grainVY     = 18.0;  // px/s vertically
    this.glitchStrength   = 0.0; // baseline intensity when a glitch occurs
    this.glitchFrequency  = 0.0;  // glitches per second
    this.dropoutIntensity = 0.0; // horizontal dropout probability/intensity
    this.blockiness       = 0.65; // pixelation amount inside glitch band
    this.glitchForce      = 0.0;  // manual burst (0..1) you can spike from JS
  }

  onPreRender () {
    const w = this.game.scale.width;
    const h = this.game.scale.height;

    this.set2f('uResolution', w, h);
    this.set1f('uTime', this.game.loop.now / 1000);

    this.set1f('uCurvature', this.curvature);
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

    // new uniforms
    this.set1f('uGrainAmount', this.grainAmount);
    this.set1f('uGrainScale',  this.grainScale);
    this.set1f('uGrainVX',     this.grainVX);
    this.set1f('uGrainVY',     this.grainVY);
    this.set1f('uGlitchStrength',   this.glitchStrength);
    this.set1f('uGlitchFrequency',  this.glitchFrequency);
    this.set1f('uDropoutIntensity', this.dropoutIntensity);
    this.set1f('uBlockiness',       this.blockiness);
    this.set1f('uGlitchForce',      this.glitchForce);
  }
}
