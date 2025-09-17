// ParallaxBackground.js (Phaser 3.90+)
// Build once, call update(delta) every frame. Images must be preloaded.

export default class Parallaxbackground {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   keys: string[],           // texture keys, back -> front
   *   speeds?: number[],        // px/s, same length as keys; default = ramp
   *   y?: number,               // top Y of the band (default 0)
   *   depthStart?: number,      // base depth for back layer (default -100)
   *   direction?: number,       // -1 = bg moves left (feel like moving right)
   *   autoResize?: boolean      // relayout on window resize (default true)
   * }} cfg
   */
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = Object.assign(
      {
        keys: [],
        speeds: [],
        y: 0,
        depthStart: -100,
        direction: -1,
        autoResize: true
      },
      cfg || {}
    );

    // Layers: [{ key, segs: Image[], speed, scale, segW }]
    this.layers = [];
    this._onResize = null;

    this.build();
    this.layout();

    if (this.cfg.autoResize) {
      this._onResize = () => this.layout();
      scene.scale.on('resize', this._onResize, this);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        scene.scale.off('resize', this._onResize, this);
      });
    }
  }

  // Create horizontally looping segments for each layer
  build() {
    // destroy old (hot-reload safety)
    this.layers.forEach(l => l.segs.forEach(img => img.destroy()));
    this.layers.length = 0;

    const vw = this.scene.scale.width;
    const vh = this.scene.scale.height;

    const keys = this.cfg.keys;
    const speeds = keys.map((_, i) =>
      (this.cfg.speeds && this.cfg.speeds[i] != null) ? this.cfg.speeds[i] : 10 + i * 15
    );

    keys.forEach((key, i) => {
      const src = this.scene.textures.get(key).getSourceImage();
      const s = vh / src.height;          // scale so ONE tile fills screen height
      const segW = src.width * s;         // display width of a segment
      const need = Math.max(2, Math.ceil(vw / segW) + 1);

      const segs = [];
      for (let j = 0; j < need; j++) {
        const img = this.scene.add.image(j * segW, this.cfg.y, key)
          .setOrigin(0, 0)
          .setScale(s)
          .setScrollFactor(0)
          .setDepth(this.cfg.depthStart + i);
        segs.push(img);
      }

      this.layers.push({ key, segs, speed: speeds[i], scale: s, segW });
    });
  }

  // Size/rebuild segments so the band always covers the full width
  layout() {
    if (!this.layers.length) return;

    const vw = this.scene.scale.width;
    const vh = this.scene.scale.height;

    this.layers.forEach((layer, i) => {
      const src = this.scene.textures.get(layer.key).getSourceImage();
      const s = vh / src.height;
      const segW = src.width * s;

      // ensure enough segments to span width
      const need = Math.max(2, Math.ceil(vw / segW) + 1);

      // add or remove to match `need`
      while (layer.segs.length < need) {
        const img = this.scene.add.image(0, this.cfg.y, layer.key)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(this.cfg.depthStart + i);
        layer.segs.push(img);
      }
      while (layer.segs.length > need) {
        layer.segs.pop().destroy();
      }

      // position/scale in a single horizontal row
      layer.segs.forEach((img, idx) => {
        img.setScale(s);
        img.setPosition(idx * segW, this.cfg.y);
      });

      layer.scale = s;
      layer.segW = segW;
    });
  }

  // Advance scrolling and wrap segments
  update(deltaMs) {
    if (!this.layers.length) return;
    const dt = deltaMs / 1000;
    const dir = Math.sign(this.cfg.direction) || -1;

    const vw = this.scene.scale.width;

    this.layers.forEach(layer => {
      const w = layer.segW;

      // move each segment
      layer.segs.forEach(img => { img.x += dir * layer.speed * dt; });

      if (dir < 0) {
        // moving left: wrap off-left to the rightmost end
        let rightmostX = Math.max(...layer.segs.map(s => s.x));
        layer.segs.forEach(img => {
          if (img.x + w < 0) {
            img.x = rightmostX + w;
            rightmostX = img.x;
          }
        });
      } else {
        // moving right: wrap off-right to the leftmost end
        let leftmostX = Math.min(...layer.segs.map(s => s.x));
        layer.segs.forEach(img => {
          if (img.x > vw) {
            img.x = leftmostX - w;
            leftmostX = img.x;
          }
        });
      }
    });
  }

  setDirection(dir) { this.cfg.direction = dir; }
  setSpeedMultiplier(mul) {
    this.layers.forEach((l, i) => { l.speed = (this.cfg.speeds?.[i] ?? l.speed) * mul; });
  }

  destroy() {
    if (this._onResize) this.scene.scale.off('resize', this._onResize, this);
    this.layers.forEach(l => l.segs.forEach(img => img.destroy()));
    this.layers.length = 0;
  }

  // ---- Optional helper to preload sequential files ----
  static preloadSequence(scene, path, baseName, count, keyPrefix = 'layer') {
    scene.load.setPath(path);
    for (let i = 0; i < count; i++) {
      scene.load.image(`${keyPrefix}${i}`, `${baseName}_${i}.png`);
    }
  }
}
