import Phaser from 'phaser';

export default class AudioScene extends Phaser.Scene {
  constructor() { super({ key: 'Audio', active: false, visible: false }); }

  preload() { /* optional: load here if you like */ }

  create() {
   // Unlock WebAudio on the first user click/tap
    this.input.once('pointerdown', () => {
      if (this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
    });
  }
}
