import { Scene } from 'phaser';
import OldTVPipeline from '../pipelines/OldTVPipeline';

export class MainMenu extends Scene {
  constructor () { super('MainMenu'); }

  create () {
    // CRT effect (registered in Boot)
    this.cameras.main.setPostPipeline('OldTV');

    // Create objects once
    this.bg   = this.add.image(0, 0, 'background').setOrigin(0.5); // make sure key matches your preloader
    this.logo = this.add.image(0, 0, 'logo').setOrigin(0.5);
    this.title = this.add.text(0, 0, 'Main Menu', {
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    const relayout = () => {
      const { width, height } = this.scale;
      const cx = width * 0.5;
      const cy = height * 0.5;

      // fullscreen background (cover)
      const cover = Math.max(width / this.bg.width, height / this.bg.height);
      this.bg.setPosition(cx, cy).setScale(cover).setScrollFactor(0);

      // centered logo
      const maxLogoW = width * 0.55, maxLogoH = height * 0.25;
      const logoScale = Math.min(1, maxLogoW / this.logo.width, maxLogoH / this.logo.height);
      this.logo.setPosition(cx, cy - height * 0.18).setScale(logoScale);

      // centered title
      this.title.setPosition(cx, cy + height * 0.18);
      this.title.setFontSize(Math.round(height * 0.044)); // ≈48px at 1080p
    };

    // initial layout + respond to resizes
    relayout();
    this.scale.on('resize', relayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', relayout, this);
    });

    // Start game on click/tap
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
