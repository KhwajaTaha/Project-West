// src/game/scenes/Boot.js
import Phaser from 'phaser';
import OldTVPipeline from '../pipelines/OldTVPipeline';

export  class Boot extends Phaser.Scene {
  constructor(){ super({ key: 'Boot' }); }

  create () {
    // Register PostFX pipeline (class, not instance)
    this.renderer.pipelines.addPostPipeline('OldTV', OldTVPipeline);
    this.scene.start('Preloader')
    this.scene.start('MainMenu'); // or Preloader / Game
  }
}
