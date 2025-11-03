export class Player {
  constructor(scene, x, y, texture, hotdogsGroup, initialShots = 20) {
    this.scene = scene;
    this.hotdogs = hotdogsGroup;

    // sprite + physics body
    this.sprite = this.scene.add.sprite(x, y, texture).setScale(0.6);
    if (this.scene.physics && !this.sprite.body) {
      this.scene.physics.add.existing(this.sprite);
      if (this.sprite.body) {
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.immovable = true;
      }
    }

    // ensure money group + overlap
    if (!this.scene.moneys && this.scene.physics) this.scene.moneys = this.scene.physics.add.group();
    if (this.scene.moneys && this.scene.physics) {
      this.scene.physics.add.overlap(this.sprite, this.scene.moneys, this._onCollectMoney, null, this);
    }

    // idle anim
    this.isThrowing = false;
    if (this.sprite.anims && this.scene.anims.exists('vendor_idle')) this.sprite.play('vendor_idle');

    // movement lanes
    this.positions = [410, 570, 740, 910];
    this.isMoving = false;

    // snap to nearest lane if needed
    this.currentIndex = this.positions.indexOf(y);
    if (this.currentIndex === -1) {
      let closest = 0, bestDist = Math.abs(y - this.positions[0]);
      for (let i = 1; i < this.positions.length; i++) {
        const d = Math.abs(y - this.positions[i]);
        if (d < bestDist) { bestDist = d; closest = i; }
      }
      this.currentIndex = closest;
      this.sprite.y = this.positions[this.currentIndex];
    }

    // ammo & HUD link (HUD is owned by scene)
    this.shots = initialShots;
    this.scene.shots = this.shots;
    if (this.scene.shotsText) this.scene.shotsText.setText(':' + this.shots);

    // input
    this.keys = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
    this._onUp = () => this.moveUp();
    this._onDown = () => this.moveDown();
    this._onSpace = () => this.throwHotdog();

    this.keys.up.on('down', this._onUp);
    this.keys.w.on('down', this._onUp);
    this.keys.down.on('down', this._onDown);
    this.keys.s.on('down', this._onDown);
    this.keys.space.on('down', this._onSpace);
    this.scene.input.on('pointerdown', this._onSpace, this);
  }

  throwHotdog() {
    const yTolerance = 6;
    const onLine = this.positions.some(p => Math.abs(this.sprite.y - p) <= yTolerance);
    if (!onLine || this.isMoving) return;
    if (this.shots <= 0) return;

    // snapshot player's position for money tween
    const playerTargetX = this.sprite.x;
    const playerTargetY = this.sprite.y;

    if (!this.isThrowing && this.scene.anims.exists('vendor_throw')) {
      this.isThrowing = true;
      this.sprite.play('vendor_throw');
      this.sprite.once('animationcomplete-vendor_throw', () => {
        this.isThrowing = false;
        if (this.scene.anims.exists('vendor_idle')) this.sprite.play('vendor_idle');
      });
    }

    const customers = this.scene.customers.getChildren();
    const sameRowCustomers = customers.filter(c => c.customer && c.customer.requested && Math.abs(c.y - this.sprite.y) <= 6);

    if (sameRowCustomers.length > 0) {
      const target = sameRowCustomers.reduce((closest, current) =>
        Math.abs(current.x - this.sprite.x) < Math.abs(closest.x - this.sprite.x) ? current : closest
      );

      if (target.customer && target.customer.requestIcon) {
        target.customer.requestIcon.destroy();
        target.customer.requestIcon = null;

        const spawnX = this.sprite.x - 50;
        const spawnY = this.sprite.y - 30;
        const hotdog = this.hotdogs.create(spawnX, spawnY, 'hotdog');
        hotdog.setScale(0.067);

        this.scene.tweens.add({
          targets: hotdog,
          x: target.x,
          y: target.y,
          duration: 2000,
          ease: 'Linear',
          onComplete: () => {
            hotdog.destroy();
             target.customer?.clearRequest?.();

             if (typeof this.onSandwichDelivered === 'function') {
        this.onSandwichDelivered();
      }

            // spawn money at customer then tween to player snapshot
           const money = this.scene.moneys?.create(target.x, target.y, 'money');
  if (money) {
    money.setScale?.(0.08);
    if (money.body) money.body.setAllowGravity(false);
    this.scene.tweens.add({
      targets: money,
      x: playerTargetX,
      y: playerTargetY,
      duration: 2800,
      ease: 'Cubic'
    });

    if (typeof this.scene.onSandwichDelivered === 'function') {
    this.scene.onSandwichDelivered();
  }
            }
          }
        });

        this.shots--;
        if (this.scene.shotsText) this.scene.shotsText.setText(':' + this.shots);

      }
    } else {
      // This block handles throws to a row with NO requesting customers.
      // This is a "mistake" by the player.
      const customersInRow = customers.filter(c => c.customer && Math.abs(c.y - this.sprite.y) <= 6);
      if (!customersInRow.length) return;

      // Find the customer closest to the player in that row.
      const targetCustomer = customersInRow.reduce((closest, current) =>
        Math.abs(current.x - this.sprite.x) < Math.abs(closest.x - this.sprite.x) ? current : closest
      );

      // Animate the sandwich throw to the non-requesting customer.
      const spawnX = this.sprite.x - 50;
      const spawnY = this.sprite.y - 30;
      const hotdog = this.hotdogs.create(spawnX, spawnY, 'hotdog');
      hotdog.setScale(0.067);

      this.shots--; // Use up a sandwich
      if (this.scene.shotsText) this.scene.shotsText.setText(':' + this.shots);

      this.scene.tweens.add({
        targets: hotdog,
        x: targetCustomer.x,
        y: targetCustomer.y,
        duration: 1800,
        ease: 'Linear',
        onComplete: () => {
          // The customer "catches" it and immediately throws it back.
          this.scene.tweens.add({
            targets: hotdog,
            x: playerTargetX, // The player's original position
            y: playerTargetY,
            duration: 800, // Faster return throw
            ease: 'Cubic.easeIn',
            onComplete: () => {
              hotdog.destroy();
              // Apply score penalty when it returns to the player.
              if (typeof this.scene._decreaseScore === 'function') {
  this.scene._decreaseScore(1);
} else {
  const currentScore = this.scene.registry.get('score') || 0;
  let next = currentScore - 1;
  if (next < 0) next = 0;           // clamp without Math.max
  this.scene.registry.set('score', next);
}


            }
          });
        }
      });
    }
  }

  _onCollectMoney(_playerSprite, money) {
    try { if (money && money.active) money.destroy(); } catch {}
    const current = this.scene.registry.get('score') || 0;
    this.scene.registry.set('score', current + 1);
  }

  moveUp()  { if (this.currentIndex <= 0 || this.isMoving) return; this.currentIndex--; this._setY(this.positions[this.currentIndex]); }
  moveDown(){ if (this.currentIndex >= this.positions.length - 1 || this.isMoving) return; this.currentIndex++; this._setY(this.positions[this.currentIndex]); }

  
  _setY(newY) {
    this.isMoving = true;
    this.scene.tweens.add({ targets: this.sprite, y: newY, duration: 100, ease: 'Power2', onComplete: () => { this.isMoving = false; } });
  }
  // --- Add more sandwiches (used when starting a new set) ---
  addShots(delta) {
  // Increase sandwich count
  this.shots += delta;

  // Update on-screen counter
  if (this.scene.shotsText) {
    this.scene.shotsText.setText(':' + this.shots);
  }

  // Notify the scene that shot count changed (if needed)
  if (typeof this.scene.onShotsChanged === 'function') {
    this.scene.onShotsChanged(this.shots);
  }
}



  lost() {
    try {
      this.keys.up.off('down', this._onUp);
      this.keys.w.off('down', this._onUp);
      this.keys.down.off('down', this._onDown);
      this.keys.s.off('down', this._onDown);
      this.keys.space.off('down', this._onSpace);
      this.scene.input.off('pointerdown', this._onSpace, this);
    } catch {}

    if (this.scene.anims.exists('vendor_lost')) this.sprite.play('vendor_lost');
    else if (this.scene.anims.exists('vendor_idle')) { this.sprite.play('vendor_idle'); this.sprite.anims.stop(); }
  }

  destroy() {
    // in case we need manual cleanup on player
    try {
      this.scene.input.off('pointerdown', this._onSpace, this);
      this.keys?.up?.off('down', this._onUp);
      this.keys?.w?.off('down', this._onUp);
      this.keys?.down?.off('down', this._onDown);
      this.keys?.s?.off('down', this._onDown);
      this.keys?.space?.off('down', this._onSpace);
    } catch {}
    try { this.sprite?.destroy?.(); } catch {}
  }
}
