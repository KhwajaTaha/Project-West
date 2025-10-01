// src/game/scenes/Game.js
import { Scene } from 'phaser';
import OldTVPipeline from '../pipelines/OldTVPipeline';
import ParallaxBackground from '../scenes/Parallaxbackground';
import TrainWithSmoke from '../scenes/TrainWithSmoke';
import PlayerOnTrain, { TrainRoofPlatform } from '../scenes/Playercontroller';
import Playercontroller from '../scenes/Playercontroller';
                                    // slower -> faster
 
export class Game extends Scene {
 constructor(){ super('Game'); }
  create () {

    //SOUND
     const audio = this.game.audio;
     


    audio.crossfadeToBank('game', 700); // crossfade from menu → game music
    
    // CRT effect if you want it here
    this.cameras.main.setPostPipeline('OldTV');

    //BACKGROUND CODE
    this.bg = new ParallaxBackground(this, {
      keys: ['desert0','desert1','desert2','desert3','desert4','desert5'],
      speeds: [222, 300, 400, 550, 750, 1000], // back -> front
      y: 0,              // top of the band
      depthStart: -100,  // keep behind gameplay
      direction: -1,     // bg left => feel like moving right
      autoResize: true
    });

 const { width, height } = this.scale;

    

    //TRAIN CODE
    if (!this.anims.exists('train-run')) {
      this.anims.create({
        key: 'train-run',
        frames: this.anims.generateFrameNumbers('train', { start: 0, end: 15 }),
        frameRate: 30, repeat: -1
      });
    }
    if (!this.anims.exists('train-carriage1-run')) {
      this.anims.create({
        key: 'train-carriage1-run',
        frames: this.anims.generateFrameNumbers('train-carriage1', { start: 0, end: 15 }),
        frameRate: 30, repeat: -1
      });
    }

    if (!this.anims.exists('train-carriage2-run')) {
      this.anims.create({
        key: 'train-carriage2-run',
        frames: this.anims.generateFrameNumbers('train-carriage2', { start: 0, end: 15 }),
        frameRate: 30, repeat: -1
      });
    }
    if (!this.anims.exists('train-carriage5-run')) {
      this.anims.create({
        key: 'train-carriage5-run',
        frames: this.anims.generateFrameNumbers('train-carriage5', { start: 0, end: 15 }),
        frameRate: 30, repeat: -1
      });
    }
    this.load.image("Still-carriage1");
    this.load.image("Still-carriage2");
    //const { width, height } = this.scale;

    // make a train
    this.train = new TrainWithSmoke(this, {
      x: width * 0.35,
      y: height * 0.75,
      scale: 2.0,
      locoKey: 'train',
      locoAnimKey: 'train-run',
      frames: 16,
      locoFrameRate: 30,
      carriageKey: 'train-carriage1',
      carriageAnimKey: 'train-carriage1-run',
      carriageFrameRate: 30,
      carriageKey1: 'train-carriage2',
      carriageAnimKey1: 'train-carriage2-run',
      carriageFrameRate1: 30,
      carriageKey2: 'train-carriage5',
      carriageAnimKey2: 'train-carriage5-run',
      carriageFrameRate2: 30,
      carriageKey3: 'Still-carriage1',
      carriageKey4: 'Still-carriage2',
      chimneyOffset: { x: 320, y: 4 },  // tweak until it sits on the chimney
      depth: 0
    });

    // slide across screen as a demo
    this.tweens.add({
      targets: this.train.root,
      x: 2300,
      duration: 5000,
      ease: 'Sine.inOut',
      yoyo: false,
      repeat: 0
    });

    //PLAYER CODE
    // 1) Create a physics "roof" that follows the train
  this.roof = new TrainRoofPlatform(this, this.train, {
    roofPadding: 6,   // raise or lower contact line on roof
    thickness: 20     // collision thickness
  });

  // 2) Create the player on the train
  this.player = new Playercontroller(this, this.roof, {
    x: this.train.root.x,            // start near the loco
    y: this.train.root.y - 60,
    // texture: 'hero',               // use your own texture/spritesheet if you have one
    speed: 260,
    accel: 1800,
    jumpVel: -620
  });

  // optional: camera follow
   //this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15); 


    // (Optional) smoke burst on click:
    //this.input.on('pointerdown', () => this.train.burst(14));


// smooth left→right→left loop
/*this.tweens.add({
  targets: trainRoot,
  x: width - margin,
  duration: 5000,           // speed
  ease: 'Sine.inOut',
  yoyo: true,
  repeat: -1
});*/
// input
     this.input.keyboard.on('keydown-V', () => {
    audio.play('bell', { volume: 1.0 });    // uses the active bank’s sfx id
    // optional: puff smoke too
    this.train?.burst?.(12);
  });
  }

    
   update(_time, dt) {
    this.train.update(dt);
    this.bg.update(dt);
     this.player.update(dt);
  }

}
