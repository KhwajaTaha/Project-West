import Phaser, { Game } from 'phaser';

import { Boot } from './scenes/Boot';
import { MainGame } from './scenes/Game';

import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            debugShowBody: false,
            debugShowStaticBody: false,
            debugShowVelocity: false,
            debugVelocityColor: 0xff0000,
            debugBodyColor: 0x00ff00,
            debugStaticBodyColor: 0x0000ff
        },
        
    },
    input: {
    keyboard: true,
    mouse: true,
    touch: true,
    gamepad: true
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame
    ]
};

const StartGame = (parent) => {
    // if a parent id is passed, override; otherwise use config.parent
    const cfg = parent ? { ...config, parent } : config;
    return new Game(cfg);
}

export default StartGame;
