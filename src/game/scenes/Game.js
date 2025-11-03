import { Player } from '../objects/Player.js';
import { Customer } from '../objects/Customer.js';

export class MainGame extends Phaser.Scene {
  constructor() {
    super('MainGame');

    // refs for teardown
    this._resizeHandler = null;
    this._gameOverUI = null;
    this._colliders = [];
    this._isCleaning = false;

    // core state
    this.isGameOver = false;

    // lives & UI
    this.lives = 5;
    this.livesText = null;

    // request/lane data (used by spawner)
    this._rows = [410, 570, 740, 910];
    this._cols = 6;
    this._startX = 200;
    this._gapX = 200;
  }

  preload() {
    // image assets
    this.load.image('vendor', 'assets/vendor.png');
    this.load.image('hotdog', 'assets/sandwich.png');
    this.load.image('customer', 'assets/Audience/1.png');
    this.load.image('customer2', 'assets/Audience/2.png');
    this.load.image('background', 'assets/bg.png');

    // request icon
    this.load.image('requestsign', 'assets/request.png');

    // money pickup & optional ball
    this.load.image('money', 'assets/images/money.png');
    this.load.image('basketball', 'assets/1.png');

    // audio
    this.load.audio('mainMusic', 'assets/Audio/theme.mp3');

    // player sheets
    this.load.spritesheet('vendor_idle', 'assets/player/stand.png', { frameWidth: 350, frameHeight: 350 });
    this.load.spritesheet('vendor_throw', 'assets/player/Throw.png', { frameWidth: 350, frameHeight: 350 });
    this.load.spritesheet('vendor_lost', 'assets/player/Lost.png', { frameWidth: 300, frameHeight: 300 });
  }

  create() {
    // background + resize
    const bg = this.add.image(0, 0, 'background').setOrigin(0);
    bg.setDisplaySize(this.scale.width, this.scale.height);
    this._resizeHandler = (gameSize) => bg.setDisplaySize(gameSize.width, gameSize.height);
    this.scale.on('resize', this._resizeHandler);

    // music
    this.mainMusic = this.sound.add('mainMusic', { loop: true, volume: 0.5 });
    this.mainMusic.play();

    // animations (guard double-create)
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

    // groups
    this.customers = this.physics.add.staticGroup();
    this.requestIcons = this.physics.add.group();
    this.hotdogs = this.physics.add.group();
    this.moneys = this.physics.add.group();

    // build customer grid
    const textures = ['customer', 'customer2'];
    for (let r = 0; r < this._rows.length; r++) {
      for (let c = 0; c < this._cols; c++) {
        const x = this._startX + c * this._gapX;
        const tex = Phaser.Utils.Array.GetRandom(textures);
        new Customer(this, x, this._rows[r], tex, this.customers);
      }
    }

    // score & HUD
    if (this.scene.settings?.data?.resetScore) this.registry.set('score', 0);
    else if (this.registry.get('score') === undefined) this.registry.set('score', 0);

    this.shotsText = this.add.text(1255, 40, ': 10', { fontSize: '50px', fill: '#fff' });
    this.showhotdogs = this.add.image(1210,60,'hotdog').setScale(0.09);

    // centralized Lives UI (moved here from Player/Customer)
    const lifeStyle = { fontFamily: 'DotGothic16', fontSize: '50px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.livesText = this.add.text(970, 150, '', lifeStyle).setScrollFactor(0).setDepth(100);
    this._setLives(5); // initialize lives and UI

    this.scoreText = this.add.text(550, 240, String(this.registry.get('score') || 0), { fontSize: '60px', fill: '#fff' });

    // registry listeners (dedupe)
    if (this._onRegistryScoreChanged) {
      this.registry.events.off('changedata-score', this._onRegistryScoreChanged, this);
      this.registry.events.off('changedata', this._onRegistryChanged, this);
    }
    this._onRegistryScoreChanged = (_parent, value) => this.scoreText?.setText(String(value));
    this._onRegistryChanged = (_parent, key, value) => { if (key === 'score') this.scoreText?.setText(String(value)); };
    this.registry.events.on('changedata-score', this._onRegistryScoreChanged, this);
    this.registry.events.on('changedata', this._onRegistryChanged, this);

    // unsubscribe on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-score', this._onRegistryScoreChanged, this);
      this.registry.events.off('changedata', this._onRegistryChanged, this);
      this._onRegistryScoreChanged = null;
      this._onRegistryChanged = null;
      if (this.mainMusic?.isPlaying) this.mainMusic.stop();
    });

    // player
    this.player = new Player(this, 1700, 910, 'vendor_idle', this.hotdogs);

    // mobile controls
    this.createMobileControls();

    // collisions (store to destroy later)
    const hotdogToRequest = this.physics.add.overlap(
      this.hotdogs,
      this.requestIcons,
      this.hitRequestIcon,
      null,
      this
    );
    this._colliders.push(hotdogToRequest);

    const moneyOverlap = this.physics.add.overlap(
      this.player.sprite,
      this.moneys,
      (p, m) => { if (typeof this.player._onCollectMoney === 'function') this.player._onCollectMoney(p, m); },
      null,
      this
    );
    this._colliders.push(moneyOverlap);

    // optional
    if (this.textures.exists('basketball')) this.add.image(1050, 67, 'basketball').setScale(0.2);

    // request spawner
    this.maxActiveRequests = 3;
    this.requestSpawner = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        if (this.isGameOver) return;

        const yTolerance = 6;
        const children = this.customers.getChildren();
        const activeCount = children.filter(s => s && s.customer && s.customer.requested).length;
        if (activeCount >= this.maxActiveRequests) return;

        const rowRequested = new Set();
        for (const s of children) {
          if (!s?.customer?.requested) continue;
          for (let ri = 0; ri < this._rows.length; ri++) {
            if (Math.abs(s.y - this._rows[ri]) <= yTolerance) { rowRequested.add(ri); break; }
          }
        }

        const available = children.filter(s => {
          if (!s?.customer || s.customer.requested) return false;
          for (let ri = 0; ri < this._rows.length; ri++) {
            if (Math.abs(s.y - this._rows[ri]) <= yTolerance) return !rowRequested.has(ri);
          }
          return false;
        });

        if (!available.length) return;
        const pick = Phaser.Utils.Array.GetRandom(available);
        pick.customer.request(7000); // 5s
      }
    });
   this.refillstation = this.add.image(1640,1000,"refillstation").setScale(0.2);
   this.desk = this.add.image(610,1015,"desk").setScale(0.3)
   this.desk1 = this.add.image(200,1015,"desk").setScale(0.3)
   this.desk2 = this.add.image(1025,1015,"desk").setScale(0.3)

//this.desk.displayWidth = this.desk.width *1.1;
   this.isGameOver = false;

   // --- PS5 / Gamepad support ---
this.input.gamepad.once('connected', (pad) => {
  console.log('[Gamepad] connected:', pad.id);
  this.pad = pad;
});

this.input.gamepad.on('disconnected', () => {
  this.pad = null;
});

// Poll gamepad each frame
this.events.on('update', () => {
  if (!this.pad || this.isGameOver) return;

  const yAxis = this.pad.axes.length > 1 ? this.pad.axes[1].getValue() : 0;
  const upPressed = this.pad.up || yAxis < -0.5;
  const downPressed = this.pad.down || yAxis > 0.5;

  // buttons: PS5 X = index 0
  const xButton = this.pad.buttons.length > 0 ? this.pad.buttons[0] : null;
  const xPressed = xButton && xButton.value > 0.5;

  // handle up/down movement once per press
  if (upPressed && !this._gpPrevUp) this.player.moveUp();
  if (downPressed && !this._gpPrevDown) this.player.moveDown();
  if (xPressed && !this._gpPrevX) this.player.throwHotdog();

  this._gpPrevUp = upPressed;
  this._gpPrevDown = downPressed;
  this._gpPrevX = xPressed;
});


  }

  // ---------- Lives & penalties centralized here ----------
  _setLives(v) {
    this.lives = v;
    this.livesText?.setText('Lives: ' + v);
    // central game-over rule
    const scoreVal = this.registry.get('score') ?? 0;
    if (v <= 0 || scoreVal <= -5) this.gameOver();
  }

  addLives(delta) {
    this._setLives(Math.max(0, this.lives + delta));
  }

  loseLife(delta = 1) {
    this.addLives(-Math.abs(delta));
  }

  onCustomerRequestTimeout(/*customer*/) {
    // when a request times out, apply penalties here (used to be in Customer.js)
    this.loseLife(1);
    const current = this.registry.get('score') || 0;
    this.registry.set('score', current - 1);
  }
  // --------------------------------------------------------

  createMobileControls() {
    if (!this.sys.game.device.input.touch) return;
    const buttonConfig = {
      fontSize: '32px',
      backgroundColor: '#000000aa',
      padding: { x: 20, y: 10 },
      fixedWidth: 60,
      fixedHeight: 60
    };
    this.upButton = this.add.text(30, this.scale.height - 240, '↑', buttonConfig)
      .setInteractive().setScrollFactor(0).setDepth(100).setAlpha(0.7).setScale(2.2);
    this.downButton = this.add.text(30, this.scale.height - 120, '↓', buttonConfig)
      .setInteractive().setScrollFactor(0).setDepth(100).setAlpha(0.7).setScale(2.2);;

    this.upButton.on('pointerdown', () => this.player?.moveUp());
    this.downButton.on('pointerdown', () => this.player?.moveDown());
  }

  hitRequestIcon(hotdog, requestIcon) {
    const customerHolder = this.customers.getChildren().find(c => c.customer && c.customer.requestIcon === requestIcon);
    if (!customerHolder?.customer) return;

    requestIcon.destroy();

    this.tweens.add({
      targets: hotdog,
      x: customerHolder.x,
      y: customerHolder.y,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        hotdog.destroy();
        customerHolder.customer.clearRequest();
        // score is increased on money collect (kept in Player overlap)
      }
    });
  }

  // ---------- Teardown helpers (unchanged from your cleanup approach) ----------
  _destroyGameOverUI() {
    if (!this._gameOverUI) return;
    for (const obj of this._gameOverUI) { try { obj?.destroy?.(); } catch {} }
    this._gameOverUI = null;
  }

  _destroyCustomClassesAndGroups() {
    // customers
    if (this.customers) {
      this.customers.getChildren().forEach(c => {
        try { c.customer?.destroy?.(); } catch {}
        try { c.destroy?.(); } catch {}
      });
      try { this.customers.clear(true, true); } catch {}
      try { this.customers.destroy?.(true); } catch {}
      this.customers = null;
    }

    // player
    if (this.player) {
      try { this.player.destroy?.(); } catch {}
      try { this.player.sprite?.destroy?.(); } catch {}
      this.player = null;
    }

    // groups
    ['requestIcons', 'hotdogs', 'moneys'].forEach(k => {
      const g = this[k];
      if (g) {
        try { g.clear?.(true, true); } catch {}
        try { g.destroy?.(true); } catch {}
        this[k] = null;
      }
    });
  }

  _fullCleanup() {
    if (this._isCleaning) return;
    this._isCleaning = true;
    try {
      this.isGameOver = true;

      try { this.requestSpawner?.remove?.(false); } catch {}
      this.requestSpawner = null;

      if (this._colliders?.length) {
        this._colliders.forEach(col => { try { col?.destroy?.(); } catch {} });
        this._colliders.length = 0;
      }

      try {
        if (this.customers) this.customers.getChildren().forEach(c => c?.customer?.clearRequest?.());
      } catch {}
      try { this.requestIcons?.clear?.(true, true); } catch {}

      try { if (this.mainMusic?.isPlaying) this.mainMusic.stop(); } catch {}
      try { this.mainMusic?.destroy?.(); } catch {}
      this.mainMusic = null;

      this._destroyGameOverUI();

      try { this.input?.removeAllListeners?.(); } catch {}
      try { this.events?.removeAllListeners?.(); } catch {}
      try { this.scale?.off?.('resize', this._resizeHandler); } catch {}
      this._resizeHandler = null;

      try { this.tweens?.killAll?.(); } catch {}
      try { this.time?.removeAllEvents?.(); } catch {}

      this._destroyCustomClassesAndGroups();
    } finally {
      this._isCleaning = false;
    }
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    try { this.requestSpawner?.remove?.(false); } catch {}
    this.requestSpawner = null;

    try {
      if (this.customers) this.customers.getChildren().forEach(c => c?.customer?.clearRequest?.());
      this.requestIcons?.clear?.(true, true);
    } catch {}

    try {
      if (this.player?.lost) this.player.lost();
      else if (this.player?.sprite && this.anims.exists('vendor_lost')) this.player.sprite.play('vendor_lost');
    } catch {}

    if (this.mainMusic?.isPlaying) {
      this.tweens.add({
        targets: this.mainMusic,
        volume: 0,
        duration: 600,
        onComplete: () => { try { this.mainMusic?.stop?.(); } catch {} }
      });
    }

    this._destroyGameOverUI();
    this._gameOverUI = [];

    const { width, height } = this.scale;
    const cx = width * 0.5, cy = height * 0.5;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setScrollFactor(0).setDepth(200);
    const panelW = Math.min(600, width * 0.8);
    const panelH = Math.min(360, height * 0.6);
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0xf5f5f5).setStrokeStyle(4, 0x000000).setDepth(210).setScrollFactor(0);

    const titleStyle = { fontFamily: 'Arial Black', fontSize: Math.round(panelH * 0.14) + 'px', color: '#000' };
    const textStyle  = { fontFamily: 'Arial',       fontSize: Math.round(panelH * 0.08) + 'px', color: '#000' };
    const title = this.add.text(cx, cy - panelH * 0.18, 'Game Over', titleStyle).setOrigin(0.5).setDepth(215).setScrollFactor(0);
    const scoreText = this.add.text(cx, cy + panelH * 0.06, 'Score: ' + (this.registry.get('score') || 0), textStyle).setOrigin(0.5).setDepth(215).setScrollFactor(0);

    const btnStyle = { fontFamily: 'Arial Black', fontSize: Math.round(panelH * 0.09) + 'px', color: '#fff', backgroundColor: '#000' };
    const menuBtn = this.add.text(cx, cy + panelH * 0.20, 'Main Menu', btnStyle)
      .setOrigin(0.5).setPadding({ x: 18, y: 10 }).setDepth(215).setInteractive({ useHandCursor: true }).setScrollFactor(0);

      const restartBtn = this.add.text(cx, cy + panelH * 0.38, 'Restart', btnStyle)
  .setOrigin(0.5)
  .setPadding({ x: 18, y: 10 })
  .setDepth(215)
  .setInteractive({ useHandCursor: true })
  .setScrollFactor(0);

this._gameOverUI.push(restartBtn);
    this._gameOverUI.push(overlay, panel, title, scoreText, menuBtn);

    menuBtn.on('pointerdown', () => {
      this._fullCleanup();
      setTimeout(() => {
        this.scene.stop('MainGame');
        this.scene.remove('MainGame');
        this.scene.start('MainMenu');
      }, 50);
    });


    //Restart button
    restartBtn.on('pointerdown', () => {
   // IMPORTANT: don't call _fullCleanup() here.
  // It kills timers/listeners mid-transition and you don't need to remove the scene to restart it.

  // Clean only transient UI/audio created by gameOver()
  try {
    if (this.mainMusic?.isPlaying) this.mainMusic.stop();
  } catch (e) {}
  this._destroyGameOverUI();

  // If you registered 'MainGame' in the Phaser.Game config, this is the safest:
  this.scene.restart({ resetScore: true });   // full re-create of the scene instance

  // If you insist on start/stop instead of restart, use:
  // this.scene.stop('MainGame');
  // this.scene.start('MainGame', { resetScore: true });
  }, 50);

  }
}
