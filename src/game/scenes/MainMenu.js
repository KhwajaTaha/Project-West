import { Scene } from 'phaser';
import { MainGame } from './Game.js';

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  preload() {
    // Optional: load menu-specific assets
    this.load.image('menu-bg', 'assets/menu/menu.png');
    this.load.image('logo', 'assets/menu/logo.png');
    this.load.image('button', 'assets/menu/button.png');
    this.load.image('buttonHover', 'assets/menu/button_hover.png');
    this.load.audio('menuMusic', 'assets/menu/menu_music.wav');
    this.load.audio('click', 'assets/menu/click.wav');
  }

  create() {
    // 🎵 Play background music
    this.music = this.sound.add('menuMusic', { volume: 0.4, loop: true });
    this.music.play();

    // 🌄 Background setup
    this. bg = this.add.image(0, 0, 'background').setOrigin(0);
    this.bg.setDisplaySize(this.scale.width, this.scale.height);
    this._resizeHandler = (gameSize) => this.bg.setDisplaySize(gameSize.width, gameSize.height);
    this.scale.on('resize', this._resizeHandler);

    // 🌀 Simple parallax movement
    this.tweens.add({
      targets: this.bg,
      y: this.bg.y + 5,
      x: this.bg.x + 5,
      duration: 5000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ✨ Logo or Title
    this.logo = this.add.image(960, 380, 'logo').setOrigin(0.5);
    this.logo.setScale(0.8);

    // Floating animation
    this.tweens.add({
      targets: this.logo,
      y: this.logo.y + 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 🕹️ Buttons
    this.createButton(this.scale.width / 2, this.scale.height * 0.70, 'Play', () => this.startGame());
    //this.createButton(this.scale.width / 2, this.scale.height * 0.65, 'Settings', () => this.openSettings());
    this.createButton(this.scale.width / 2, this.scale.height * 0.84, 'Exit', () => this.exitGame());

    // ✨ Fade-in effect
    this.cameras.main.fadeIn(1000, 0, 0, 0);


    // 🧭 Handle resizing
    //this.scale.on('resize', this.relayout, this);
  }

  createButton(x, y, text, callback) {
    const btn = this.add.image(x, y, 'button').setOrigin(0.5);
    const label = this.add.text(x, y, text, {
      fontFamily: 'Arial Black',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setTexture('buttonHover'))
      .on('pointerover', () =>this.sound.play('click'))
      .on('pointerout', () => btn.setTexture('button'))
      .on('pointerdown', () => {
        this.sound.play('click');
        callback();
      });
  }

  startGame() {
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.music.stop();
      this.sound.stopAll();
      this.scene.start('MainGame', { resetScore: true });
    });
  }

  openSettings() {
    console.log('Settings clicked — implement settings scene here');
  }

  exitGame() {
    // For web games, this might redirect or show a confirm popup
    if (confirm('Are you sure you want to quit?')) {
      window.close();
    }
  }


// Call initially and on window resize

  relayout(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    this.bg.setDisplaySize(1920, 1080);
    this.logo.setPosition(width / 2, height * 0.25);
  }
}
