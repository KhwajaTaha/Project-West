export class Player {
  constructor(scene, x, y, texture, hotdogsGroup, initialShots = 10) {
    this.scene = scene;
    this.hotdogs = hotdogsGroup;

    // vendor sprite (use spritesheet key if provided)
    this.sprite = this.scene.add.sprite(x, y, texture).setScale(0.6);

    // ensure the player has a physics body so we can overlap with money
    if (this.scene.physics && !this.sprite.body) {
      this.scene.physics.add.existing(this.sprite);
      // make player immovable and not affected by gravity
      if (this.sprite.body) {
        this.sprite.body.setAllowGravity(false);
        this.sprite.body.immovable = true;
      }
    }

    // ensure a money physics group exists on the scene
    if (!this.scene.moneys && this.scene.physics) {
      this.scene.moneys = this.scene.physics.add.group();
    }

    // overlap handler: when player overlaps money, collect it and increase score
    if (this.scene.moneys && this.scene.physics) {
      this.scene.physics.add.overlap(this.sprite, this.scene.moneys, this._onCollectMoney, null, this);
    }

    // play idle animation if available
    this.isThrowing = false;
    if (this.sprite.anims && this.scene.anims.exists('vendor_idle')) {
      this.sprite.play('vendor_idle');
    }

    // allowed Y positions (order matters)
    this.positions = [410, 570, 740, 910];

    // movement flag
    this.isMoving = false;

    // find or snap to nearest index
    this.currentIndex = this.positions.indexOf(y);
    if (this.currentIndex === -1) {
      let closest = 0;
      let bestDist = Math.abs(y - this.positions[0]);
      for (let i = 1; i < this.positions.length; i++) {
        const d = Math.abs(y - this.positions[i]);
        if (d < bestDist) { bestDist = d; closest = i; }
      }
      this.currentIndex = closest;
      this.sprite.y = this.positions[this.currentIndex];
    }

    // shots and UI sync
    this.shots = initialShots;
    this.scene.shots = this.shots;
    if (this.scene.shotsText) this.scene.shotsText.setText('Hotdogs: ' + this.shots);

    // lives: player starts with 5 lives; mirror on scene and update UI if present
    this.lives = 5;
    this.scene.lives = this.lives;

    // create a visible Lives text if scene doesn't already have one
    if (!this.scene.livesText && this.scene.add) {
      // place at top-left; adjust values as needed
      const style = { fontFamily: 'DotGothic16', fontSize: '50px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
      this.scene.livesText = this.scene.add.text(970, 150, 'Lives: ' + this.lives, style).setScrollFactor(0).setDepth(100);
    } else if (this.scene.livesText && this.scene.livesText.setText) {
      this.scene.livesText.setText('Lives: ' + this.lives);
    }

    // install a simple proxy on scene.lives so any external code that writes this.scene.lives
    // will update the UI and check for game over. Only install once per scene.
    if (!this.scene._livesProxyInstalled) {
      let _lives = this.scene.lives;
      Object.defineProperty(this.scene, 'lives', {
        configurable: true,
        enumerable: true,
        get() { return _lives; },
        set(v) {
          _lives = v;
          // update UI if present
          if (this.livesText && this.livesText.setText) {
            this.livesText.setText('Lives: ' + _lives);
          }
          // game over conditions: lives <= 0 OR score <= -5
          const scoreVal = (typeof this.score === 'number') ? this.score : null;
          if (_lives <= 0 || (scoreVal !== null && scoreVal <= -5)) {
            if (typeof this.gameOver === 'function') {
              this.gameOver();
            }
          }
        }
      });
      this.scene._livesProxyInstalled = true;
    }

    // --- input: SPACE to throw + mouse click to throw ---
    // keyboard up/down (W/S and arrows) + space for throwing
    this.keys = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // bind single-step movement handlers
    this._onUp = () => this.moveUp();
    this._onDown = () => this.moveDown();
    this._onSpace = () => this.throwHotdog();

    // attach handlers (spacebar)
    this.keys.up.on('down', this._onUp);
    this.keys.w.on('down', this._onUp);
    this.keys.down.on('down', this._onDown);
    this.keys.s.on('down', this._onDown);
    this.keys.space.on('down', this._onSpace);

    // attach mouse click / pointerdown to also throw
    this.scene.input.on('pointerdown', this._onSpace, this);
  }

  throwHotdog() {
    // Restrict throwing: only when aligned to allowed Y positions and NOT mid-tween
    const yTolerance = 6;
    const onLine = this.positions.some(p => Math.abs(this.sprite.y - p) <= yTolerance);
    if (!onLine || this.isMoving) return;

    if (this.shots <= 0) return;

    // capture player's position at the time of throwing -> money will be thrown back to this point
    const playerTargetX = this.sprite.x;
    const playerTargetY = this.sprite.y;

    // play throw animation (guard against retrigger)
    if (!this.isThrowing && this.scene.anims.exists('vendor_throw')) {
      this.isThrowing = true;
      this.sprite.play('vendor_throw');

      // when throw animation completes, go back to idle (unless lost)
      this.sprite.once('animationcomplete-vendor_throw', () => {
        this.isThrowing = false;
        if (this.scene.anims.exists('vendor_idle')) {
          this.sprite.play('vendor_idle');
        }
      });
    }

    // Find requesting customers on current row
    const customers = this.scene.customers.getChildren();
    const sameRowCustomers = customers.filter(c =>
      c.customer &&
      c.customer.requested &&
      Math.abs(c.y - this.sprite.y) <= 6
    );

    if (sameRowCustomers.length > 0) {
      // Get closest requesting customer
      const target = sameRowCustomers.reduce((closest, current) =>
        Math.abs(current.x - this.sprite.x) < Math.abs(closest.x - this.sprite.x)
          ? current
          : closest
      );

      if (target.customer && target.customer.requestIcon) {
        // Immediately destroy the request icon
        const requestIcon = target.customer.requestIcon;
        requestIcon.destroy();
        target.customer.requestIcon = null;

        // Spawn hotdog and animate to customer
        const spawnX = this.sprite.x - 50;
        const spawnY = this.sprite.y - 30;
        const hotdog = this.hotdogs.create(spawnX, spawnY, 'hotdog');
        hotdog.setScale(0.067);

        // Animate hotdog to customer
        this.scene.tweens.add({
          targets: hotdog,
          x: target.x,
          y: target.y,
          duration: 2000,
          ease: 'Linear',
          onComplete: () => {
            // when the customer receives the sandwich, spawn money at the customer's position
            hotdog.destroy();
            if (typeof target.customer.clearRequest === 'function') {
              target.customer.clearRequest();
            }

            // create money sprite at customer and tween it back to where the player was
            if (this.scene.moneys) {
              const money = this.scene.moneys.create(target.x, target.y, 'money');
              if (money.setScale) money.setScale(0.08);
              if (money.body) money.body.setAllowGravity(false);

              this.scene.tweens.add({
                targets: money,
                x: playerTargetX,
                y: playerTargetY,
                duration: 2800,
                ease: 'Cubic',
                onComplete: () => {
                  // if money wasn't collected by overlap, destroy it on arrival
                //  if (money && money.active) {
                    //try { money.destroy(); } catch (e) { /* ignore */ }
                 // }
                }
              });
            }
            // NOTE: score is no longer incremented immediately here.
            // Score will be increased when player collides with the money (see overlap handler).
          }
        });

        this.shots--;
        if (this.scene.shotsText) {
          this.scene.shotsText.setText('Hotdogs: ' + this.shots);
        }

        // previously the game ended when shots === 0; remove that behavior so running out of hotdogs
        // does not immediately end the game. The player simply cannot throw while shots <= 0.
        // if you want a visual cue/respawn of hotdogs, implement scene.restockHotdogs() or similar here.
        // if (this.shots === 0) {
        //   this.scene.time.delayedCall(1500, () => this.scene.gameOver(), [], this.scene);
        // }
      }
    } else {
      // No requesting customer on this row -> nearest customer on the row catches and throws money back to player's last position
      const sameRowAnyCustomers = customers.filter(c => c.customer && Math.abs(c.y - this.sprite.y) <= 6);
      if (sameRowAnyCustomers.length === 0) return; // nothing to catch it

      // pick nearest customer in row
      const catcher = sameRowAnyCustomers.reduce((closest, current) =>
        Math.abs(current.x - this.sprite.x) < Math.abs(closest.x - this.sprite.x) ? current : closest
      );

      const spawnX = this.sprite.x - 50;
      const spawnY = this.sprite.y - 30;
      const hotdog = this.hotdogs.create(spawnX, spawnY, 'hotdog');
      hotdog.setScale(0.067);

      // animate to catcher
      this.scene.tweens.add({
        targets: hotdog,
        x: catcher.x,
        y: catcher.y,
        duration: 1800,
        ease: 'Linear',
        onComplete: () => {
          // optional: inform customer they 'caught' it (if handler exists)
          if (catcher.customer && typeof catcher.customer.onCaughtHotdog === 'function') {
            try { catcher.customer.onCaughtHotdog(); } catch (e) { /* ignore */ }
          }

          // short delay to simulate catcher reaction, then throw money back to player's recorded position
          this.scene.time.delayedCall(250, () => {
            // destroy the hotdog (they convert it to money)
            if (hotdog && hotdog.active) {
              try { hotdog.destroy(); } catch (e) { /* ignore */ }
            }

            // spawn money at catcher and tween to where the player was
            if (this.scene.moneys) {
              const money = this.scene.moneys.create(catcher.x, catcher.y, 'hotdog');
              if (money.setScale) money.setScale(0.1);
              //if (money.body) money.body.setAllowGravity(false);

              // optional: inform customer they threw it back
              if (catcher.customer && typeof catcher.customer.onThrowBack === 'function') {
                try { catcher.customer.onThrowBack(); } catch (e) { /* ignore */ }
              }

              this.scene.tweens.add({
                targets: money,
                x: playerTargetX,
                y: playerTargetY,
                duration: 800,
                ease: 'Cubic',
                onComplete: () => {
                  // if money wasn't collected by overlap, destroy it on arrival
                  if (money && money.active) {
                    try { money.destroy(); } catch (e) { /* ignore */ }
                  }
                }
              });
            }

            // NOTE: removed the previous score penalty. Score now changes only when player collects money.
          }, [], this);
        }
      });
    }
  }

  // called by physics overlap when player picks up money
  _onCollectMoney(playerSprite, money) {
    try {
      if (money && money.active) money.destroy();
    } catch (e) { /* ignore */ }

    // use registry to persist score across scenes
    const current = this.scene.registry.get('score') || 0;
    this.scene.registry.set('score', current + 1);
    // scoreText is updated via registry event listener in the scene
  }

  moveUp() {
    if (this.currentIndex <= 0 || this.isMoving) return;
    this.currentIndex--;
    this._setY(this.positions[this.currentIndex]);
  }

  moveDown() {
    if (this.currentIndex >= this.positions.length - 1 || this.isMoving) return;
    this.currentIndex++;
    this._setY(this.positions[this.currentIndex]);
  }

  _setY(newY) {
    // mark moving, then clear when tween completes
    this.isMoving = true;
    this.scene.tweens.add({
      targets: this.sprite,
      y: newY,
      duration: 100,
      ease: 'Power2',
      onComplete: () => { this.isMoving = false; }
    });
  }

  // call when game over happens
  lost() {
    // stop accepting input
    try {
      this.keys.up.off('down', this._onUp);
      this.keys.w.off('down', this._onUp);
      this.keys.down.off('down', this._onDown);
      this.keys.s.off('down', this._onDown);
      this.keys.space.off('down', this._onSpace);
      this.scene.input.off('pointerdown', this._onSpace, this);
    } catch (e) { /* ignore */ }

    // play lost animation if available
    if (this.scene.anims.exists('vendor_lost')) {
      this.sprite.play('vendor_lost');
    } else {
      this.sprite.play('vendor_idle');
      if (this.scene.anims.exists('vendor_idle')) {
        // no lost animation: just go to idle (in case vendor was throwing)
        this.sprite.anims.stop();
      }
    }
  }
}

