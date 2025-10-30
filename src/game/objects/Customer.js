//import { debug } from "webpack";

export class Customer {
  constructor(scene, x, y, texture, group) {
    this.scene = scene;

    if (group) {
      this.sprite = group.create(x, y, texture);
      // Explicitly enable physics body for debugging
      this.sprite.refreshBody();
    } else {
      this.sprite = this.scene.physics.add.staticSprite(x, y, texture);
    }

    this.sprite.setScale(0.15);
    this.sprite.customer = this;

    // Make sure body is enabled but can start inactive
    if (this.sprite.body) {
      this.sprite.body.enable = false;
      // Set a specific size for the physics body if needed
      this.sprite.body.setSize(this.sprite.width * 0.8, this.sprite.height * 0.8);
    }

    // request state
    this.requested = false;
    this.requestIcon = null;
    this.requestTimer = null;
    this._followListener = null;
  }

  // Start a request: show an icon above the customer for `duration` ms
  request(duration = 5000) {
    if (this.requested) return;
    this.requested = true;

    // use the sprite coordinates (this.x / this.y do not exist on the Customer object)
    const iconX = this.sprite.x;
    const iconY = this.sprite.y - 90;

    // spawn request icon (uses scene.requestIcons group)
    this.requestIcon = this.scene.requestIcons.create(iconX, iconY, 'requestsign').setScale(0.04);

   // play request sfx
    if (this.scene.sound) {
      try {
        this.scene.sound.play('request_sfx', { volume: 2.6 });
       // debug.log("pp")
            } catch (e) { /* ignore if not loaded */ }
    }

    // make sure icon is visible above other sprites and not affected by gravity
    if (this.requestIcon.setDepth) this.requestIcon.setDepth(10);
    if (this.requestIcon.body) {
      this.requestIcon.body.setAllowGravity(false);
      if (this.requestIcon.body.setImmovable) this.requestIcon.body.setImmovable(true);
    }

    // schedule timeout to penalize if unreceived
    this.requestTimer = this.scene.time.delayedCall(duration, () => this.onRequestTimeout(), [], this);
  }

  // Clear request / remove icon
  clearRequest() {
    // called when the hotdog was delivered successfully
    if (this.requestTimer) {
      this.requestTimer.remove(false);
      this.requestTimer = null;
    }

    if (this.requestIcon) {
      this.requestIcon.destroy();
      this.requestIcon = null;
    }

    this.requested = false;
  }

  onRequestTimeout() {
    // only penalize if still requested (wasn't fulfilled)
    if (!this.requested) return;

    // remove request visuals
    if (this.requestIcon) {
      this.requestIcon.destroy();
      this.requestIcon = null;
    }

    this.requested = false;
    this.requestTimer = null;

    // apply penalties: decrement one life and reduce score by 1
    // ensure scene fields exist
    if (typeof this.scene.lives !== 'number') this.scene.lives = 5;
    this.scene.lives = Math.max(0, this.scene.lives - 1);
    if (this.scene.livesText) this.scene.livesText.setText('Lives: ' + this.scene.lives);

    const current = this.scene.registry.get('score') || 0;
    this.scene.registry.set('score', current - 1);

    // game over conditions
    if (this.scene.lives <= 0 || this.scene.score <= -5) {
      if (typeof this.scene.gameOver === 'function') {
        this.scene.gameOver();
      }
    }
  }

  destroy() {
    this.clearRequest();
    if (this.sprite && this.sprite.destroy) this.sprite.destroy();
  }

  // inside the method that shows the request icon (e.g. showRequest() or createRequestIcon())
  createRequestIcon() {
    const requestIcon = this.scene.add.sprite(this.x, this.y - 40, 'requestIconKey');
    this.requestIcon = requestIcon;

    
  }
}