import { Player } from '../objects/Player.js';
import { Customer } from '../objects/Customer.js';

export class MainGame extends Phaser.Scene {
  constructor() {
    super('MainGame');
  }

  preload() {
    // image assets
    this.load.image('vendor', 'assets/vendor.png');
    this.load.image('hotdog', 'assets/sandwich.png');
    this.load.image('customer', 'assets/Audience/1.png');
    this.load.image('customer2', 'assets/Audience/2.png');
    this.load.image('background', 'assets/bg.png');

    // icon shown when a customer requests a sandwich
    this.load.image('requestsign', 'assets/request.png');

    // money pickup image (used when customers throw money back)
    this.load.image('money', 'assets/images/money.png');

    // basketball (make sure file exists at d:\Phaser\Sandwich-hustle\assets\1.png or change path)
    this.load.image('basketball', 'assets/1.png');

    // background music for main game scene
    this.load.audio('mainMusic', 'assets/Audio/theme.mp3');

    // vendor spritesheet: load here (not in Preloader)
    // adjust frameWidth/frameHeight to match your spritesheet
    this.load.spritesheet('vendor_idle', 'assets/player/stand.png', {
      frameWidth: 350,
      frameHeight: 350
    });
    this.load.spritesheet('vendor_throw', 'assets/player/Throw.png', {
      frameWidth: 350,
      frameHeight: 350
    });
    this.load.spritesheet('vendor_lost', 'assets/player/Lost.png', {
      frameWidth: 300,
      frameHeight: 300
    });
  }

  create() {
    // Background: fill the entire game canvas and handle resize
    const bg = this.add.image(0, 0, 'background').setOrigin(0);
    bg.setDisplaySize(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize) => {
      bg.setDisplaySize(gameSize.width, gameSize.height);
    });

    // --- start background music (looped) ---
    this.mainMusic = this.sound.add('mainMusic', { loop: true, volume: 0.5 });
    this.mainMusic.play();

    // ---- create vendor animations BEFORE creating the Player ----
    // note: use the exact spritesheet keys loaded in preload
    if (!this.anims.exists('vendor_idle')) {
      this.anims.create({
        key: 'vendor_idle',
        frames: this.anims.generateFrameNumbers('vendor_idle', { start: 0, end: 0 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('vendor_throw')) {
      this.anims.create({
        key: 'vendor_throw',
        frames: this.anims.generateFrameNumbers('vendor_throw', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 0
      });
    }

    if (!this.anims.exists('vendor_lost')) {
      this.anims.create({
        key: 'vendor_lost',
        frames: this.anims.generateFrameNumbers('vendor_lost', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    }

    // Customers (6 per row)
    this.customers = this.physics.add.staticGroup();
    const rows = [410, 570, 740, 910];
    const cols = 6;
    const startX = 200;
    const gapX = 200; // adjust spacing as needed

    // textures to pick from randomly
    const customerTextures = ['customer', 'customer2'];

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * gapX;
        const tex = Phaser.Utils.Array.GetRandom(customerTextures);
        new Customer(this, x, rows[r], tex, this.customers);
      }
    }

    // limit active requests
    this.maxActiveRequests = 3;

    // start periodic requests (pick a random non-requesting customer every 1.2s)
    this.requestSpawner = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        const yTolerance = 6;
        console.log("pp", this.maxActiveRequests)
        // count currently requested customers
        const children = this.customers.getChildren();
        const activeCount = children.filter(s => s && s.customer && s.customer.requested).length;
        if (activeCount >= this.maxActiveRequests) return; // at global limit

        // build a set of rows that already have an active request
        const rowRequested = new Set();
        for (const s of children) {
          if (!s || !s.customer) continue;
          if (s.customer.requested) {
            // find which predefined row this sprite belongs to
            for (let ri = 0; ri < rows.length; ri++) {
              if (Math.abs(s.y - rows[ri]) <= yTolerance) {
                rowRequested.add(ri);
                break;
              }
            }
          }
        }

        // collect available customers whose row does NOT currently have a request
        const available = children.filter(s => {
          if (!s || !s.customer) return false;
          if (s.customer.requested) return false;
          // find row index
          for (let ri = 0; ri < rows.length; ri++) {
            if (Math.abs(s.y - rows[ri]) <= yTolerance) {
              return !rowRequested.has(ri);
            }
          }
          return false;
        });

        if (available.length === 0) return;

        const pick = Phaser.Utils.Array.GetRandom(available);
        pick.customer.request(5000); // request for 5 seconds
      }
    });

    // Score (persisted in registry). Reset only if MainMenu asked for a reset.
    if (this.scene.settings && this.scene.settings.data && this.scene.settings.data.resetScore) {
      this.registry.set('score', 0);
    } else if (this.registry.get('score') === undefined) {
      this.registry.set('score', 0);
    }
    this.shotsText = this.add.text(20, 45, 'Hotdogs: 10', { fontSize: '18px', fill: '#fff' });
    this.scoreText = this.add.text(550, 240, String(this.registry.get('score') || 0), { fontSize: '60px', fill: '#fff' });

    // update scoreText whenever registry score changes
    // remove any previous handlers (protect against scene restart / duplicate listeners)
    if (this._onRegistryScoreChanged) {
      this.registry.events.off('changedata-score', this._onRegistryScoreChanged, this);
      this.registry.events.off('changedata', this._onRegistryChanged, this);
    }

    // specific key event (signature: parent, value)
    this._onRegistryScoreChanged = (parent, value) => {
      if (this.scoreText && typeof this.scoreText.setText === 'function') {
        this.scoreText.setText(String(value));
      }
    };

    // generic changedata event (signature: parent, key, value) — fallback for some Phaser versions
    this._onRegistryChanged = (parent, key, value) => {
      if (key === 'score' && this.scoreText && typeof this.scoreText.setText === 'function') {
        this.scoreText.setText(String(value));
      }
    };

    this.registry.events.on('changedata-score', this._onRegistryScoreChanged, this);
    this.registry.events.on('changedata', this._onRegistryChanged, this);

    // clean up listeners on scene shutdown to avoid leaks / duplicate handlers after restart
    this.events.off('shutdown', this._removeRegistryListeners, this);
    this._removeRegistryListeners = () => {
      if (this._onRegistryScoreChanged) {
        this.registry.events.off('changedata-score', this._onRegistryScoreChanged, this);
      }
      if (this._onRegistryChanged) {
        this.registry.events.off('changedata', this._onRegistryChanged, this);
      }
    };
    this.events.on('shutdown', this._removeRegistryListeners, this);

    // Create a group for request icons to handle collisions
    this.requestIcons = this.physics.add.group();

    // Group for hotdogs
    this.hotdogs = this.physics.add.group();

    // Group for money pickups (player overlaps these)
    this.moneys = this.physics.add.group();

    // --- create player and gameplay colliders (must be here, not in cleanup) ---
    // Player: place at game start (adjust X/Y as needed)
    this.player = new Player(this, 1700, 910, 'vendor_idle', this.hotdogs);

    // Add mobile control buttons
    this.createMobileControls();

    // Hotdogs should collide/overlap with request icons for deliveries
    this.physics.add.overlap(this.hotdogs, this.requestIcons, this.hitRequestIcon, null, this);

    // Basketball image (only add if texture was loaded)
    if (this.textures.exists('basketball')) {
      this.add.image(1050, 67, 'basketball').setScale(0.2);
    } else {
      console.warn('basketball texture not found; skipping show');
    }

    // ensure Player overlap with money group exists (Player may also register overlap internally;
    // this is a safe duplicate guard)
    if (this.player && this.moneys) {
      this.physics.add.overlap(this.player.sprite, this.moneys, (p, m) => {
        // delegate to player handler if available
        if (typeof this.player._onCollectMoney === 'function') this.player._onCollectMoney(p, m);
      }, null, this);
    }
  }

  createMobileControls() {
    // Only create mobile controls if device has touch capability
    if (!this.sys.game.device.input.touch) return;

    const buttonConfig = {
      fontSize: '32px',
      backgroundColor: '#000000aa',
      padding: { x: 20, y: 10 },
      fixedWidth: 60,
      fixedHeight: 60
    };

    // Up button
    this.upButton = this.add.text(100, this.scale.height - 140, '↑', buttonConfig)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(100);

    // Down button
    this.downButton = this.add.text(100, this.scale.height - 70, '↓', buttonConfig)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(100);

    // Make buttons semi-transparent
    this.upButton.setAlpha(0.7);
    this.downButton.setAlpha(0.7);

    // Add touch/pointer events
    this.upButton.on('pointerdown', () => {
      if (this.player) this.player.moveUp();
    });

    this.downButton.on('pointerdown', () => {
      if (this.player) this.player.moveDown();
    });

    // Make buttons fixed to camera
    this.upButton.setScrollFactor(0);
    this.downButton.setScrollFactor(0);
  }

  // New method to handle hotdog hitting request icon
  hitRequestIcon(hotdog, requestIcon) {
    // Find the customer that owns this request icon
    const customer = this.customers.getChildren().find(c => 
      c.customer && c.customer.requestIcon === requestIcon
    );

    if (customer && customer.customer) {
      // Immediately destroy request icon
      requestIcon.destroy();
      
      // Animate hotdog to customer position
      this.tweens.add({
        targets: hotdog,
        x: customer.x,
        y: customer.y,
        duration: 1000,
        ease: 'Linear',
        onComplete: () => {
          hotdog.destroy();
          customer.customer.clearRequest();
          const newScore = (this.registry.get('score') || 0) + 1;
          this.registry.set('score', newScore);
        }
      });
    }
  }

  // helper: destroy any game-over UI created by gameOver()
  _destroyGameOverUI() {
    if (!this._gameOverUI) return;
    try {
      for (const obj of this._gameOverUI) {
        if (obj && obj.destroy) {
          obj.destroy();
        }
      }
    } catch (e) {
      console.warn('Error destroying gameOver UI', e);
    }
    this._gameOverUI = null;
  }

  gameOver() {
    // mark game over so other logic can check
    this.isGameOver = true;

    // stop spawning requests
    if (this.requestSpawner) {
      this.requestSpawner.remove(false);
      this.requestSpawner = null;
    }

    // clear all active customer requests and remove request icons
    if (this.customers) {
      const children = this.customers.getChildren();
      for (const c of children) {
        if (c && c.customer && typeof c.customer.clearRequest === 'function') {
          c.customer.clearRequest();
        }
      }
    }
    if (this.requestIcons) {
      this.requestIcons.clear(true, true);
    }

    // stop player input and trigger lost animation
    if (this.player) {
      if (typeof this.player.lost === 'function') {
        this.player.lost();
      } else if (this.player.sprite && this.anims.exists('vendor_lost')) {
        this.player.sprite.play('vendor_lost');
      }
    }

    // fade out & stop music
    if (this.mainMusic && this.mainMusic.isPlaying) {
      this.tweens.add({
        targets: this.mainMusic,
        volume: 0,
        duration: 600,
        onComplete: () => {
          if (this.mainMusic) this.mainMusic.stop();
        }
      });
    }

    // ensure previous game over UI is removed
    this._destroyGameOverUI();
    this._gameOverUI = [];

    // Create a dim overlay
    const { width, height } = this.scale;
    const cx = width * 0.5;
    const cy = height * 0.5;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200);
    this._gameOverUI.push(overlay);

    // Panel background
    const panelW = Math.min(600, width * 0.8);
    const panelH = Math.min(360, height * 0.6);
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0xf5f5f5)
      .setStrokeStyle(4, 0x000000)
      .setDepth(210)
      .setScrollFactor(0);
    this._gameOverUI.push(panel);

    // Title & score text (use visible font sizes)
    const titleStyle = { fontFamily: 'Arial Black', fontSize: Math.round(panelH * 0.14) + 'px', color: '#000' };
    const textStyle = { fontFamily: 'Arial', fontSize: Math.round(panelH * 0.08) + 'px', color: '#000' };

    const title = this.add.text(cx, cy - panelH * 0.18, 'Game Over', titleStyle).setOrigin(0.5).setDepth(215).setScrollFactor(0);
    const scoreText = this.add.text(cx, cy + panelH * 0.06, 'Score: ' + (this.registry.get('score') || 0), textStyle).setOrigin(0.5).setDepth(215).setScrollFactor(0);

    this._gameOverUI.push(title, scoreText);

    // Main Menu button (returns to MainMenu)
    const btnStyle = { fontFamily: 'Arial Black', fontSize: Math.round(panelH * 0.09) + 'px', color: '#fff', backgroundColor: '#000' };
    const menuBtn = this.add.text(cx, cy + panelH * 0.28, 'Main Menu', btnStyle)
      .setOrigin(0.5)
      .setPadding({ x: 18, y: 10 })
      .setDepth(215)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0);
    this._gameOverUI.push(menuBtn);

    menuBtn.on('pointerdown', () => {
      // perform full cleanup synchronously, then use a browser timer to start MainMenu.
      // (Phaser time events may be removed during cleanup which cancels Phaser delayedCall)
      try { this._fullCleanup(); } catch (e) { console.warn('full cleanup failed', e); }
      // use window.setTimeout so the call isn't cleared by Phaser's time manager
      window.setTimeout(() => {
        this.scene.start('MainMenu');
      }, 50);
    });
  }

  // Complete teardown for returning to main menu
  _fullCleanup() {
    try {
      // remove game over UI
      this._destroyGameOverUI();

      // run existing scene-level cleanup (groups, colliders, tweens, music, timers)
      this._sceneCleanup && this._sceneCleanup();// --- SCENE CLEANUP helper (used on shutdown / before restart) ---
    
      try {
        if (this.requestSpawner) { this.requestSpawner.remove(false); this.requestSpawner = null; }
        // destroy all world colliders (prevents "size" on undefined)
        if (this.physics && this.physics.world && this.physics.world.colliders) {
          this.physics.world.colliders.destroy();
        }
        // safely clear & destroy groups
        if (this.requestIcons) { this.requestIcons.clear(true, true); this.requestIcons.destroy(true); this.requestIcons = null; }
        if (this.hotdogs) { this.hotdogs.clear(true, true); this.hotdogs.destroy(true); this.hotdogs = null; }
        if (this.customers) { this.customers.clear(true, true); this.customers.destroy(true); this.customers = null; }
        // kill remaining tweens / timers
        if (this.tweens) this.tweens.killAll();
        if (this.time) {
          try { this.time.removeAllEvents && this.time.removeAllEvents(); } catch (e) { /* ignore */ }
        }
        if (this.mainMusic && this.mainMusic.isPlaying) { this.mainMusic.stop(); }
      } catch (e) {
        console.warn('scene cleanup error', e);
      }
    
    this.events.on('shutdown', this._sceneCleanup, this);
    this.events.on('destroy', this._sceneCleanup, this);

    // Player and gameplay setup live in create(); cleanup should not recreate them.
      // remove registry listeners
      if (this._removeRegistryListeners) {
        try { this._removeRegistryListeners(); } catch(e) { /* ignore */ }
      }

      // stop and destroy music
      if (this.mainMusic) {
        try { this.mainMusic.stop(); } catch(e) {}
        try { this.mainMusic.destroy(); } catch(e) {}
        this.mainMusic = null;
      }

      // stop & remove any remaining tweens / timers
      try { this.tweens && this.tweens.killAll(); } catch(e) {}
      try { this.time && this.time.removeAllEvents && this.time.removeAllEvents(); } catch(e) {}

      // destroy player instance and sprite
      if (this.player) {
        try {
          if (typeof this.player.lost === 'function') this.player.lost();
        } catch (e) {}
        try { if (this.player.sprite && this.player.sprite.destroy) this.player.sprite.destroy(); } catch(e) {}
        this.player = null;
      }

      // destroy customers group and children
      if (this.customers) {
        try { this.customers.clear(true, true); } catch(e) {}
        try { this.customers.destroy(true); } catch(e) {}
        this.customers = null;
      }

      // destroy request icons / hotdogs groups
      if (this.requestIcons) { try { this.requestIcons.clear(true, true); this.requestIcons.destroy(true); } catch(e) {} this.requestIcons = null; }
      if (this.hotdogs) { try { this.hotdogs.clear(true, true); this.hotdogs.destroy(true); } catch(e) {} this.hotdogs = null; }

      // remove input listeners
      try { this.input && this.input.removeAllListeners && this.input.removeAllListeners(); } catch(e) {}

      // remove scene listeners
      try { this.events && this.events.removeAllListeners && this.events.removeAllListeners(); } catch(e) {}

      // remove scale resize listeners (best-effort)
      try { this.scale && this.scale.off && this.scale.off('resize'); } catch(e) {}

      // clear any stored references
      this._onRegistryScoreChanged = null;
      this._onRegistryChanged = null;
      this._removeRegistryListeners = null;
      this._sceneCleanup = null;
      this._gameOverUI = null;
    } catch (err) {
      console.warn('Full cleanup error', err);
    }
    
  }

  // ensure music is stopped if scene is shut down
  // (add near end of file inside class create() or constructor if preferred)
  // for example in create() after starting music:
  // this.events.on('shutdown', () => { if (this.mainMusic) this.mainMusic.stop(); }, this);
}