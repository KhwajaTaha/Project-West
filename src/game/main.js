import AudioScene from './scenes/AudioScene';
import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { AUTO, Game } from 'phaser';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: Phaser.WEBGL,
  parent: 'game',              // <div id="game"></div> in index.html
  backgroundColor: '#000000',
  scale: {
    width: 1920,
    height: 1080,
    mode: Phaser.Scale.ENVELOP,     // cover the parent (may crop a little)
    autoCenter: Phaser.Scale.CENTER_BOTH
    },
      physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },   // or 0 if you want no gravity globally
      debug: false
    }
},
    scene: [
        
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        GameOver,
        AudioScene
    ]
};

const StartGame = (parent) => {

    return new Game({ ...config, parent });

}

export default StartGame;
