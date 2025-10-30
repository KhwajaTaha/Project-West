import { Scene } from 'phaser';


export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        
    
  
    }

  preload()
  {
    this.load.image('vendor', 'assets/vendor.png');
    this.load.image('hotdog', 'assets/sandwich.png');
    this.load.image('customer', 'assets/1.png');
    this.load.image('background', 'assets/bg3.png');
    this.load.image('basketball', 'assets/basketball.png');
    this.load.image('mainmenu', 'assets/mainmenu2.png');
    this.load.image('money', 'assets/money.png');

    // add this in your scene's preload()
    this.load.audio('request_sfx', 'assets/sfx/request_sfx.mp3');
  }
  create(){
    this.scene.start('MainMenu');
  }
}
