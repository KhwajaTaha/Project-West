import { Scene } from 'phaser';
import { MainGame } from './Game.js';

export class MainMenu extends Scene {
  constructor () { super('MainMenu'); }

  create () {

    //SOUND
    //const audio = this.game.audio;
    //audio.playBankMusic('menu');    

    // CRT effect (registered in Boot)
   // this.cameras.main.setPostPipeline('OldTV');

    // Create objects once
    // Background: use center origin so the relayout centering & cover scale work correctly
    this.bg = this.add.image(0, 0, 'mainmenu').setOrigin(0.5, 0.5);
    this.bg.setScrollFactor(0); // keep background fixed
    this.bg.setDepth(0);
    // this.logo = this.add.image(0, 0, 'logo').setOrigin(0.5);
    /*this.Gametitle = this.add.text(0, 0, 'Sandwich-Please', {
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);*/
    this.title = this.add.text(0, 0, 'Tap To Play', {
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    const FIT_MODE = 'stretch'; // 'contain' | 'cover' | 'stretch' -> choose desired behavior

    const relayout = () => {
      const { width, height } = this.scale;
      const cx = width * 0.5;
      const cy = height * 0.5;

      // choose fitting strategy
      if (FIT_MODE === 'stretch') {
        // force exact fill (may distort image)
        this.bg.setPosition(cx, cy);
        this.bg.setDisplaySize(Math.ceil(width), Math.ceil(height));
      } else if (FIT_MODE === 'cover') {
        // cover -> fill and crop (maintains aspect ratio)
        const cover = Math.max(width / this.bg.width, height / this.bg.height);
        this.bg.setPosition(cx, cy).setScale(cover);
      } else { // contain
        // contain -> fit fully with letterbox/pillarbox (maintains aspect ratio, no crop)
        const contain = Math.min(width / this.bg.width, height / this.bg.height);
        this.bg.setPosition(cx, cy).setScale(contain);
      }

      this.bg.setScrollFactor(0);

    //  this.Gametitle.setPosition(cx, cy - height * 0.18);
     // this.Gametitle.setFontSize(Math.round(height * 0.084));

     // this.title.setPosition(cx, cy + height * 0.18);
    //  this.title.setFontSize(Math.round(height * 0.044));
    };

    // initial layout + respond to resizes
    relayout();
    this.scale.on('resize', relayout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', relayout, this);
    });

    // Start game on click/tap — pass reset flag so Game knows to zero the score
    this.input.once('pointerdown', () => {
  if (!this.scene.get('MainGame')) {
    this.scene.add('MainGame', MainGame, true,{ resetScore: true });
    this.scene.start('MainGame', { resetScore: true });
    this.scene.stop('MainMenu');
  } else {
    this.scene.start('MainGame', { resetScore: true });
    this.scene.stop('MainMenu');
  }
});
  }
}
