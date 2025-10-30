export class Customer {
  constructor(scene, x, y, texture, group) {
    this.scene = scene;

    if (group) {
      this.sprite = group.create(x, y, texture);
      this.sprite.refreshBody();
    } else {
      this.sprite = this.scene.physics.add.staticSprite(x, y, texture);
    }

    this.sprite.setScale(0.15);
    this.sprite.customer = this;

    if (this.sprite.body) {
      this.sprite.body.enable = false;
      this.sprite.body.setSize(this.sprite.width * 0.8, this.sprite.height * 0.8);
    }

    this.requested = false;
    this.requestIcon = null;
    this.requestTimer = null;
    this._followListener = null;
  }

  request(duration = 5000) {
    if (this.requested) return;
    this.requested = true;

    // Play the sound effect for the new request
    this.scene.sound.play('request_sfx', { volume: 0.7 });

    const iconX = this.sprite.x;
    const iconY = this.sprite.y - 90;

    this.requestIcon = this.scene.requestIcons.create(iconX, iconY, 'requestsign').setScale(0.04);
    if (this.requestIcon.setDepth) this.requestIcon.setDepth(10);
    if (this.requestIcon.body) {
      this.requestIcon.body.setAllowGravity(false);
      if (this.requestIcon.body.setImmovable) this.requestIcon.body.setImmovable(true);
    }

    this.requestTimer = this.scene.time.delayedCall(duration, () => this.onRequestTimeout(), [], this);
  }

  clearRequest() {
    if (this.requestTimer) { this.requestTimer.remove(false); this.requestTimer = null; }
    if (this.requestIcon) { this.requestIcon.destroy(); this.requestIcon = null; }
    this.requested = false;
  }

  onRequestTimeout() {
    if (!this.requested) return;

    if (this.requestIcon) { this.requestIcon.destroy(); this.requestIcon = null; }
    this.requested = false;
    this.requestTimer = null;

    // DELEGATE to scene: lives/score are owned by Game.js now
    if (typeof this.scene.onCustomerRequestTimeout === 'function') {
      this.scene.onCustomerRequestTimeout(this);
    }
  }

  destroy() {
    this.clearRequest();
    if (this.sprite?.destroy) this.sprite.destroy();
  }
}
