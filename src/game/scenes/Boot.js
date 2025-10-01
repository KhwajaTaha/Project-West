// src/game/scenes/Boot.js
import Phaser from 'phaser';
import OldTVPipeline from '../pipelines/OldTVPipeline';
import AudioScene from './AudioScene';
import SoundSystem from './SoundSystem';

export  class Boot extends Phaser.Scene {
  constructor(){ super({ key: 'Boot' }); }

  create () {
     // 1) Launch the persistent audio scene
    this.scene.launch('Audio');
    const audioScene = this.scene.get('Audio');

    // 2) Wait until the Audio scene is fully created (then it has .sound)
    const startNext = () => {
      this.game.audio = new SoundSystem(audioScene);  // <-- now audioScene.sound exists
      this.scene.start('Preloader');
    };

    if (audioScene.scene.isActive()) {
      // already active (hot reload / devtools resume)
      startNext();
    } else {
      audioScene.events.once(Phaser.Scenes.Events.CREATE, startNext);
    }
  
    // Register PostFX pipeline (class, not instance)
    this.renderer.pipelines.addPostPipeline('OldTV', OldTVPipeline);
    // apply per scene
this.cameras.main.setPostPipeline('OldTV');

// after 1 tick, grab the instance & tweak
this.time.delayedCall(0, () => {
  const p = this.cameras.main.getPostPipeline(OldTVPipeline)
         || (this.cameras.main.getPostPipeline('OldTV')||[])[0];

  // heavier running grain
  p.grainAmount = 0.22;   // strength
  p.grainScale  = 3.0;    // bigger = chunkier grain
  p.grainVX     = 80;     // px/s
  p.grainVY     = 24;

  // more glitchy
  p.glitchStrength  = 0.0;
  p.glitchFrequency = 0.0;
  p.dropoutIntensity= 0.0;
  p.blockiness      = 0.0;
});
    this.scene.start('Preloader')
    this.scene.start('MainMenu'); // or Preloader / Game
  }
}
