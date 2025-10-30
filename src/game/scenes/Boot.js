// src/game/scenes/Boot.js
import Phaser from 'phaser';


export  class Boot extends Phaser.Scene {
  constructor(){ super({ key: 'Boot' }); }

  create () {
    this.scene.start('Preloader');
    this.scene.start('MainMenu'); // or Preloader / Game
  }
}
