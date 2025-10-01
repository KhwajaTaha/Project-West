// SoundSystem.js — Phaser 3.55 → 3.90
// Singleton-style manager bound to the AudioScene's SoundManager.
// Use SoundSystem.preload(...) in any loader scene to load your audio.

import Phaser from 'phaser';
import AudioScene from './AudioScene';

export default class SoundSystem {
  /**
   * @param {Phaser.Scene} audioScene - the persistent AudioScene (never stopped)
   */
  constructor(audioScene) {
    if (!audioScene || !audioScene.sound) {
      throw new Error('SoundSystem requires an active Scene with .sound (use the AudioScene).');
    }
    this.scene = audioScene;
    this.sm = audioScene.sound;        // BaseSoundManager
    this.banks = new Map();            // name -> { music, sfx }
    this.activeBank = null;
    this.currentMusic = null;
    this._musicKey = null;
    this.master = 1.0;                 // master volume
    this.musicVol = 1.0;               // music bus multiplier
    this.sfxVol = 1.0;                 // sfx bus multiplier
    this.muted = false;
  }

  // ---------- Static helpers ----------

  /**
   * Preload a flat manifest of audio files.
   * Example:
   * SoundSystem.preload(scene, {
   *   menu_music: ['assets/audio/menu.ogg','assets/audio/menu.mp3'],
   *   click:      ['assets/audio/ui/click.ogg','assets/audio/ui/click.mp3'],
   * })
   */
  static preload(loaderScene, manifest) {
    loaderScene.load.setPath('');
    Object.entries(manifest || {}).forEach(([key, src]) => {
      const files = Array.isArray(src) ? src : [src];
      loaderScene.load.audio(key, files);
    });
  }

  // ---------- Banks ----------

  /**
   * Register a "bank" (e.g., 'menu', 'game') with music + sfx keys.
   * bankDef = { music: { key, loop?, volume? }, sfx: { click: 'ui_click', hover: 'ui_hover', ... } }
   */
  registerBank(name, bankDef) {
    const norm = { music: null, sfx: {}, ...bankDef };
    this.banks.set(name, norm);
    return this;
  }

  /** Select a bank so you can play SFX by id without full keys. */
  useBank(name) { this.activeBank = name; return this; }

  // ---------- Music ----------

  /** Play (or crossfade to) a music key. Options: { loop=true, volume=1, fade=600 } */
  playMusic(key, { loop = true, volume = 1, fade = 600 } = {}) {
    if (!key) return;
    if (this._musicKey === key && this.currentMusic && this.currentMusic.isPlaying) return;

    const newMusic = this.sm.add(key, { loop, volume: 0 });
    newMusic.play();

    const targetVol = volume * this.musicVol * this.master * (this.muted ? 0 : 1);

    if (this.currentMusic && this.currentMusic.isPlaying) {
      // crossfade
      this._tweenVol(this.currentMusic, 0, fade, () => { this.currentMusic.stop(); this.currentMusic.destroy(); });
      this._tweenVol(newMusic, targetVol, fade);
    } else {
      this._tweenVol(newMusic, targetVol, fade);
    }

    this.currentMusic = newMusic;
    this._musicKey = key;
  }

  /** Play bank music (uses registerBank name) */
  playBankMusic(bankName, opts) {
    const bank = this.banks.get(bankName);
    if (!bank?.music?.key) return;
    const conf = { loop: bank.music.loop !== false, volume: bank.music.volume ?? 1, ...(opts||{}) };
    this.playMusic(bank.music.key, conf);
    this.useBank(bankName);
  }

  /** Stop music, with optional fade ms (default 300). */
  stopMusic(fade = 300) {
    if (!this.currentMusic) return;
    this._tweenVol(this.currentMusic, 0, fade, () => { this.currentMusic.stop(); this.currentMusic.destroy(); this.currentMusic = null; this._musicKey = null; });
  }

  /** Convenience crossfade to another bank's music. */
  crossfadeToBank(bankName, fade = 600) {
    const bank = this.banks.get(bankName);
    if (!bank?.music?.key) return;
    this.playMusic(bank.music.key, { loop: bank.music.loop !== false, volume: bank.music.volume ?? 1, fade });
    this.useBank(bankName);
  }

  // ---------- SFX ----------

  /** Play a raw sfx key. Options: { volume=1, detune=0, rate=1 } */
  playSFX(key, { volume = 1, detune = 0, rate = 1 } = {}) {
    if (!key) return null;
    const vol = volume * this.sfxVol * this.master * (this.muted ? 0 : 1);
    const s = this.sm.add(key);
    s.play({ volume: vol, detune, rate });
    s.once('complete', () => s.destroy());
    return s;
  }

  /** Play a sfx by id from the active bank’s sfx table, fallback to global key. */
  play(idOrKey, opts) {
    const bank = this.banks.get(this.activeBank);
    const key = bank?.sfx?.[idOrKey] ?? idOrKey;
    return this.playSFX(key, opts);
  }

  // ---------- Mixer ----------

  setMasterVolume(v) { this.master = Phaser.Math.Clamp(v, 0, 1); this._applyMusicVolume(); return this; }
  setMusicVolume(v)  { this.musicVol = Phaser.Math.Clamp(v, 0, 1); this._applyMusicVolume(); return this; }
  setSfxVolume(v)    { this.sfxVol   = Phaser.Math.Clamp(v, 0, 1); return this; }

  mute(on = true)   { this.muted = !!on; this._applyMusicVolume(); return this; }
  toggleMute()      { return this.mute(!this.muted); }

  // ---------- Internals ----------

  _applyMusicVolume() {
    if (!this.currentMusic) return;
    const base = 1.0; // music's authored volume is handled at playMusic
    const vol = base * this.musicVol * this.master * (this.muted ? 0 : 1);
    this.currentMusic.setVolume(vol);
  }

  _tweenVol(sound, to, dur, onComplete) {
    const from = sound.volume;
    if (dur <= 0) { sound.setVolume(to); onComplete && onComplete(); return; }
    this.scene.tweens.add({
      targets: sound, volume: to, duration: dur, ease: 'Linear',
      onComplete: () => onComplete && onComplete()
    });
  }
}
