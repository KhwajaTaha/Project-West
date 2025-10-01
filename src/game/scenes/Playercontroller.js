// PlayerOnTrain.js — Phaser 3.55+ to 3.90
// Usage (in a scene):
//   import PlayerOnTrain, { TrainRoofPlatform } from '../entities/PlayerOnTrain';
//   const roof = new TrainRoofPlatform(this, this.train, { roofPadding: 6, thickness: 20 });
//   this.player = new PlayerOnTrain(this, roof, { x: 600, y: 400 });

import Phaser from 'phaser';

/** Invisible physics platform that hugs the train roof and moves with it. */
export class TrainRoofPlatform {
  /**
   * @param {Phaser.Scene} scene
   * @param {any} trainLike  // TrainWithSmoke instance OR a Container/Sprite with getBounds()
   * @param {{roofPadding?:number, thickness?:number, depth?:number}} opts
   */
  constructor(scene, trainLike, opts = {}) {
    this.scene = scene;
    this.opts = { roofPadding: 6, thickness: 18, depth: -10, ...opts };

    // Accept either TrainWithSmoke or a container/sprite:
    this.trainGO = trainLike?.root ?? trainLike;

    // Helpful guard
    if (!scene || !scene.physics || !scene.physics.add) {
      throw new Error('TrainRoofPlatform: Arcade Physics not enabled or wrong scene passed. Use new TrainRoofPlatform(this, ...) in a scene with physics.');
    }
    if (!this.trainGO || typeof this.trainGO.getBounds !== 'function') {
      const name = trainLike?.constructor?.name || typeof trainLike;
      throw new Error(`TrainRoofPlatform: expected TrainWithSmoke instance or GameObject with getBounds(). Got: ${name}`);
    }

    // Invisible physics rect
    this.rect = scene.add.rectangle(0, 0, 10, this.opts.thickness, 0x00ff00, 0)
      .setOrigin(0.5, 0.5)
      .setDepth(this.opts.depth);

    scene.physics.add.existing(this.rect);
    /** @type {Phaser.Physics.Arcade.Body} */
    this.body = this.rect.body;
    this.body.setAllowGravity(false).setImmovable(true);

    this.prevX = 0;
    this.dx = 0;

    this.update(); // position once
  
  }

  /** Call each frame to follow the train roof and cache dx for conveyor effect. */
  update() {
    const b = this.trainGO.getBounds();  // {x, y, width, height, centerX, top, ...}
    const yTop = b.top + this.opts.roofPadding;

    const centerX = b.centerX;
    const w = Math.max(8, b.width);

    // compute dx before move
    this.dx = centerX - this.prevX;

    // move the GO and update body
    this.rect.setPosition(centerX, yTop);
    this.rect.displayWidth = w;
    this.body.setSize(w, this.opts.thickness);

    // refresh the body’s AABB (different names across Phaser versions)
    if (this.body.updateFromGameObject) this.body.updateFromGameObject(this.rect);
    else if (this.body.refreshBody) this.body.refreshBody();

    this.prevX = centerX;
  }

  destroy() { this.rect.destroy(); }
}

/** Keyboard-driven player that stands on the train and can move & jump. */
export default class Playercontroller {
  /**
   * @param {Phaser.Scene} scene
   * @param {TrainRoofPlatform} roofPlatform
   * @param {{
   *   x:number, y:number, texture?:string, frame?:number,
   *   speed?:number, accel?:number, drag?:number,
   *   jumpVel?:number, gravityY?:number, depth?:number
   * }} cfg
   */
  constructor(scene, roofPlatform, cfg) {
    this.scene = scene;
    this.roof = roofPlatform;

    const c = Object.assign({
      x: 0, y: 0, texture: '_playerBox', frame: 0,
      speed: 240, accel: 1600, drag: 1000,
      jumpVel: -520, gravityY: 1000, depth: 20
    }, cfg || {});

    // minimal placeholder texture if none provided
    if (!scene.textures.exists(c.texture)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 18, 28, 4);
      g.fillStyle(0x2b2b2b, 1);
      g.fillRoundedRect(2, 14, 14, 12, 2); // pants
      g.generateTexture(c.texture, 18, 28);
      g.destroy();
    }

    // physics sprite
    this.sprite = scene.physics.add.sprite(c.x, c.y, c.texture, c.frame)
      .setOrigin(0.5, 1)                // feet at bottom
      .setDepth(c.depth)
      .setBounce(0)
      .setCollideWorldBounds(true);

    this.sprite.body.setGravityY(c.gravityY);
    this.sprite.body.setDragX(c.drag);
    this.sprite.body.setMaxVelocity(c.speed, 1000);

    // collider with the moving roof platform
    scene.physics.add.collider(this.sprite, this.roof.rect);

    // input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jumpW: Phaser.Input.Keyboard.KeyCodes.W
    });

    this.cfg = c;
    this._onGround = false;
  }

  /** Whether feet are on something (train roof). */
  get onGround() {
    const b = /** @type {Phaser.Physics.Arcade.Body} */ (this.sprite.body);
    return b.blocked.down || b.touching.down;
  }

  /** Call from Scene.update(dt) */
  update(dt) {
    // platform follows train
    this.roof.update();

    const body = /** @type {Phaser.Physics.Arcade.Body} */ (this.sprite.body);
    const leftDown  = this.cursors.left.isDown  || this.keys.left.isDown;
    const rightDown = this.cursors.right.isDown || this.keys.right.isDown;

    // horizontal control (acceleration for nice feel)
    if (leftDown === rightDown) {
      body.setAccelerationX(0); // idle / both pressed
    } else if (leftDown) {
      body.setAccelerationX(-this.cfg.accel);
    } else if (rightDown) {
      body.setAccelerationX(this.cfg.accel);
    }

    // jump (SPACE / UP / W)
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpW);

    if (jumpPressed && this.onGround) {
      body.setVelocityY(this.cfg.jumpVel);
    }

    // conveyer effect: inherit the roof's horizontal motion while grounded
    if (this.onGround && this.roof.dx !== 0) {
      // add the platform delta to player's position so he "sticks" naturally
      this.sprite.x += this.roof.dx;
    }
  }

  setPosition(x, y) { this.sprite.setPosition(x, y); return this; }
  destroy() { this.sprite?.destroy(); }
}
