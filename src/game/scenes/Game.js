// src/game/scenes/Game.js
import { Scene } from 'phaser';
import OldTVPipeline from '../pipelines/OldTVPipeline';
import ParallaxBackground from '../scenes/Parallaxbackground';
                                    // slower -> faster

export class Game extends Scene {
 constructor(){ super('Game'); }
  create () {
    // CRT effect if you want it here
    this.cameras.main.setPostPipeline('OldTV');

    function makeLongSmokeTexture(scene, key = 'smoke_long') {
  if (scene.textures.exists(key)) return key;

  const W = 128, H = 128;
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, W, H);

  // Core lobe — light gray, elongated & rotated
  ctx.save();
  ctx.translate(W * 0.38, H * 0.58);
  ctx.rotate(-Math.PI * 0.32);
  ctx.scale(2.2, 1.2);
  let g1 = ctx.createRadialGradient(0, 0, 6, 0, 0, 46);
  g1.addColorStop(0.00, 'rgba(255,255,255,0.95)'); // bright center
  g1.addColorStop(0.50, 'rgba(230,236,240,0.55)');
  g1.addColorStop(1.00, 'rgba(255,255,255,0.00)'); // feathered edge
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Outer halo — very soft
  ctx.save();
  ctx.translate(W * 0.55, H * 0.35);
  ctx.rotate(-Math.PI * 0.32);
  ctx.scale(2.6, 1.0);
  let g2 = ctx.createRadialGradient(0, 0, 8, 0, 0, 58);
  g2.addColorStop(0.00, 'rgba(245,248,250,0.22)');
  g2.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  tex.refresh();
  return key;
}


    this.bg = new ParallaxBackground(this, {
      keys: ['desert0','desert1','desert2','desert3','desert4','desert5'],
      speeds: [222, 300, 400, 550, 750, 1000], // back -> front
      y: 0,              // top of the band
      depthStart: -100,  // keep behind gameplay
      direction: -1,     // bg left => feel like moving right
      autoResize: true
    });

    // … your game objects (train, UI, etc.) go here …
    // --- Create the animation once (safe-guard with exists) ---
    const animKey = 'train-run';
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers('train', { start: 0, end: 15 }),
        frameRate: 30,   // from spritesheet metadata (100 ms per frame)
        repeat: -1
      });
    }

    // --- Add the sprite and play the animation ---
    const { width, height } = this.scale;
    const trainRoot = this.add.container(width * 0.5, height * 0.6);
    const train = this.add.sprite(0, 0, 'train')
      .setOrigin(-0.2,-1.3)
      .play(animKey)
      .setScale(2.0)     // tweak to fit your scene
      .setAngle(0);    // match your angled look if you like
    trainRoot.add(train);

    // After you create `trainRoot` (the container) and add the train sprite:


// start near the left edge
const margin = 120;
trainRoot.setPosition(margin, height * 0.6);


// Make the texture once
const smokeKey = makeLongSmokeTexture(this, 'smoke_long');

// CHIMNEY_LOCAL should be your local offset from the train container center
const CHIMNEY_LOCAL = new Phaser.Math.Vector2(650, 790);
const chimney = this.add.zone(CHIMNEY_LOCAL.x, CHIMNEY_LOCAL.y, 1, 1);
trainRoot.add(chimney);

// Create the emitter (no createEmitter in 3.90)
this.smoke = this.add.particles(0, 0, smokeKey, {
  follow: chimney,                     // emit from chimney
  frequency: 55, quantity: 1,          // cadence
  lifespan: { min: 900, max: 1600 },
  alpha:   { start: 0.85, end: 0.0 },  // fade
  scale:   { start: 0.4, end: 0.65 }, // grow as it drifts
  rotate:  { min: -8, max: 8 },        // slight twist per puff

  // drift backwards (to the left) with a touch of upward buoyancy
  speedX:  { min: -260, max: -170 },   // negative = left
  speedY:  { min: -70,  max:  -28 },
  gravityY: -18,                       // rise a bit
  accelerationX: { min: -10, max: -40 },

 tint: 0xE6ECF0,                            // #e6ecf0
  blendMode: Phaser.BlendModes.SCREEN  
});
this.smoke.setDepth((trainRoot.depth ?? 0) + 1);



// smooth left→right→left loop
/*this.tweens.add({
  targets: trainRoot,
  x: width - margin,
  duration: 5000,           // speed
  ease: 'Sine.inOut',
  yoyo: true,
  repeat: -1
});*/
  }

  
   update(_t, dt) {
    this.bg.update(dt);
  }

}
