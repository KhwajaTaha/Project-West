// TrainWithSmoke.js — Phaser 3.55+ to 3.90 compatible
// Default export! Import with:  import TrainWithSmoke from '../entities/TrainWithSmoke';

import Phaser from 'phaser';

// ---- makes a soft, elongated white/gray smoke texture once ----
function makeLongSmokeTexture(scene, key = 'smoke_long') {
  if (scene.textures.exists(key)) return key;

  const W = 128, H = 128;
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, W, H);

  // core lobe
  ctx.save();
  ctx.translate(W * 0.38, H * 0.58);
  ctx.rotate(-Math.PI * 0.32);
  ctx.scale(2.2, 1.2);
  const g1 = ctx.createRadialGradient(0, 0, 6, 0, 0, 46);
  g1.addColorStop(0.00, 'rgba(255,255,255,0.95)');
  g1.addColorStop(0.50, 'rgba(230,236,240,0.55)');
  g1.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // outer halo
  ctx.save();
  ctx.translate(W * 0.55, H * 0.35);
  ctx.rotate(-Math.PI * 0.32);
  ctx.scale(2.6, 1.0);
  const g2 = ctx.createRadialGradient(0, 0, 8, 0, 0, 58);
  g2.addColorStop(0.00, 'rgba(245,248,250,0.22)');
  g2.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  tex.refresh();
  return key;
}

export default class TrainWithSmoke {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   x:number, y:number, scale?:number, depth?:number,
   *   locoKey:string, locoAnimKey?:string, locoFrameRate?:number, frames?:number,
   *   carriageKey?:string, carriageAnimKey?:string, carriageFrameRate?:number,
   *   carriageKey1?:string, carriageAnimKey1?:string, carriageFrameRate1?:number, 
   *   carriageKey2?:string, carriageAnimKey2?:string, carriageFrameRate2?:number,
   *   carriageKey3?:string, 
   *   carriageKey4?:string, 
   *   chimneyOffset?:{x:number,y:number},   // from loco origin (0.5,1), pixels BEFORE scale
   *   jitter?:{enabled?:boolean, ampPos?:number, ampRot?:number, intervalMs?:number}
   * }} cfg
   */
  constructor(scene, cfg) {
    this.scene = scene;
    const c = {
      x: 0, y: 0, scale: 1, depth: 0,
      locoKey: 'train', locoAnimKey: 'train-run', locoFrameRate: 30, frames: 16,
      carriageKey: null, carriageAnimKey: null, carriageFrameRate: 30, carriageGap: null,
      chimneyOffset: { x: 64, y: -36 },
      jitter: { enabled: true, ampPos: 1.2, ampRot: 0.6, intervalMs: 45 },
      ...cfg
    };
    this.config = c;

    // ---- root container for the whole train ----
    this.root = scene.add.container(c.x, c.y).setDepth(c.depth);

    // ---- locomotive ----
    this.loco = scene.add.sprite(0, 0, c.locoKey)
      .setOrigin(0.23, -0.15)
      .setScale(c.scale);
    this.root.add(this.loco);

    if (!scene.anims.exists(c.locoAnimKey)) {
      scene.anims.create({
        key: c.locoAnimKey,
        frames: scene.anims.generateFrameNumbers(c.locoKey, { start: 0, end: c.frames - 1 }),
        frameRate: c.locoFrameRate,
        repeat: -1
      });
    }
    this.loco.play(c.locoAnimKey);

    // ---- optional carriages ----
    this.carriage = null;
    if (c.carriageKey) {
      const frameW = this.loco.width; // unscaled frame width
      this.carriage = scene.add.sprite(-485, 0, c.carriageKey)
        .setOrigin(0.27, -0.15)
        .setScale(c.scale);
      this.root.add(this.carriage);

      if (c.carriageAnimKey && !scene.anims.exists(c.carriageAnimKey)) {
        scene.anims.create({
          key: c.carriageAnimKey,
          frames: scene.anims.generateFrameNumbers(c.carriageKey, { start: 0, end: c.frames - 1 }),
          frameRate: c.carriageFrameRate,
          repeat: -1
        });
      }
      if (c.carriageAnimKey) this.carriage.play(c.carriageAnimKey);
    }


    this.carriage1 = null;
    if (c.carriageKey1) {
      const frameW = this.loco.width; // unscaled frame width
      this.carriage1 = scene.add.sprite(-990, 0, c.carriageKey1)
        .setOrigin(0.27, -0.15)
        .setScale(c.scale);
      this.root.add(this.carriage1);

      if (c.carriageAnimKey1 && !scene.anims.exists(c.carriageAnimKey1)) {
        scene.anims.create({
          key: c.carriageAnimKey1,
          frames: scene.anims.generateFrameNumbers(c.carriageKey1, { start: 0, end: c.frames - 1 }),
          frameRate: c.carriageFrameRate1,
          repeat: -1
        });
      }
      if (c.carriageAnimKey1) this.carriage1.play(c.carriageAnimKey1);
    }

    this.carriage2 = null;
    if (c.carriageKey2) {
      const frameW = this.loco.width; // unscaled frame width
      this.carriage2 = scene.add.sprite(-1490, 0, c.carriageKey2)
        .setOrigin(0.27, -0.15)
        .setScale(c.scale);
      this.root.add(this.carriage2);

      if (c.carriageAnimKey2 && !scene.anims.exists(c.carriageAnimKey2)) {
        scene.anims.create({
          key: c.carriageAnimKey2,
          frames: scene.anims.generateFrameNumbers(c.carriageKey2, { start: 0, end: c.frames - 1 }),
          frameRate: c.carriageFrameRate2,
          repeat: -1
        });
      }
      if (c.carriageAnimKey2) this.carriage2.play(c.carriageAnimKey2);
    }
    this.carriage3 = null;
    if (c.carriageKey3) {
      const frameW = this.loco.width; // unscaled frame width
      this.carriage3 = scene.add.sprite(-1990, 0, c.carriageKey3)
        .setOrigin(0.27, -0.15)
        .setScale(c.scale);
      this.root.add(this.carriage3);

    }
    this.carriage4 = null;
    if (c.carriageKey4) {
      const frameW = this.loco.width; // unscaled frame width
      this.carriage4 = scene.add.sprite(-2490, 0, c.carriageKey4)
        .setOrigin(0.27, -0.15)
        .setScale(c.scale);
      this.root.add(this.carriage4);

    }
    // ---- chimney (local) offset BEFORE scale ----
    this._chimneyLocal = new Phaser.Math.Vector2(c.chimneyOffset.x, c.chimneyOffset.y);

    // ---- particles (Phaser 3.55 & 3.90 compatibility) ----
    const smokeKey = makeLongSmokeTexture(scene, 'smoke_long');

    // In <=3.60 you get a ParticleEmitterManager and must call createEmitter.
    // In 3.90 you can pass a config directly and get a ParticleEmitter-like GO.
    let emitterGO = null;
    let emitter = null;

    // try new style first: add.particles(x,y, texture, config) returns GO w/ setDepth
    try {
      emitter = scene.add.particles(0, 0, smokeKey, {
        frequency: 55, quantity: 1,
        lifespan: { min: 900, max: 1600 },
        alpha:   { start: 0.85, end: 0.0 },
        scale:   { start: 0.4, end: 0.65 },
        rotate:  { min: -8, max: 8 },
        speedX:  { min: -260, max: -170 },
        speedY:  { min: -70,  max:  -28 },
        gravityY: -18,
        accelerationX: { min: -10, max: -40 },
        tint: 0xE6ECF0,
        blendMode: Phaser.BlendModes.SCREEN
      });
      emitterGO = emitter; // in 3.90 this is the GameObject
    } catch (e) {
      // fallback for old API: manager + createEmitter
      const mgr = scene.add.particles(0, 0, smokeKey);
      emitter = mgr.createEmitter({
        frequency: 55, quantity: 1,
        lifespan: { min: 900, max: 1600 },
        alpha:   { start: 0.7, end: 0.0 },
        scale:   { start: 0.55 * c.scale, end: 1.35 * c.scale },
        rotate:  { min: -8, max: 8 },
        speedX:  { min: -260, max: -170 },
        speedY:  { min: -18,  max:  28 },
        gravityY: -22,
        accelerationX: { min: -10, max: -40 },
        tint: 0xE6ECF0,
        blendMode: Phaser.BlendModes.SCREEN
      });
      emitterGO = mgr;
    }

    this.smokeEmitter = emitter;            // the emitter interface
    this.smokeGO = emitterGO;               // thing you can setDepth/position on
    if (this.smokeGO.setDepth) this.smokeGO.setDepth(c.depth + 1);


    // initial pin
    this._syncSmokeToChimney();
  }

  // convert the chimney local offset into world coords and pin the emitter there
  _syncSmokeToChimney() {
    const mat = this.root.getWorldTransformMatrix();
    const sx = this.root.scaleX ?? 1;
    const sy = this.root.scaleY ?? 1;

    const lx = this._chimneyLocal.x * sx;
    const ly = this._chimneyLocal.y * sy;

    const pt = new Phaser.Math.Vector2();
    mat.transformPoint(lx, ly, pt);

    if (this.smokeGO?.setPosition) this.smokeGO.setPosition(pt.x, pt.y);
    else { this.smokeGO.x = pt.x; this.smokeGO.y = pt.y; }
  }

  update(_dtMs) {
    this._syncSmokeToChimney();
  }

  setPosition(x, y) { this.root.setPosition(x, y); return this; }
  setAngle(a) { this.root.setAngle(a); return this; }
  setScale(s) { this.root.setScale(s); return this; }

  /** optional: adjust wind/backdraft at runtime */
  setSmokeDrift(vxRange = [-260, -170], vyRange = [-18, 28]) {
    if (this.smokeEmitter?.setSpeedX) this.smokeEmitter.setSpeedX(vxRange);
    if (this.smokeEmitter?.setSpeedY) this.smokeEmitter.setSpeedY(vyRange);
  }

  burst(count = 12) {
    // ensure up-to-date position, then explode
    this._syncSmokeToChimney();
    if (this.smokeEmitter?.explode) {
      this.smokeEmitter.explode(count, this.smokeGO.x, this.smokeGO.y);
    }
  }

  destroy() {
    this._jitterEvt?.remove(false);
    if (this.smokeGO?.destroy) this.smokeGO.destroy();
    this.root?.destroy(true);
  }
}
