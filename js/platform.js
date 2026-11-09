'use strict';
/* =====================================================================
 *  Platform adapter — Playgama build.
 *  Talks to the Yandex-style API that playgama-yandex-shim.js exposes on
 *  top of Playgama Bridge (window.YaGames). Implements the Platform.*
 *  contract used by the game core.
 *  Playgama build: English by default, no sign-in, no leaderboard.
 * ===================================================================== */

const Platform = {
  name: 'playgama',
  // which UI parts exist in this build
  features: { mute: true, language: false, leaderboard: false, ads: true },
  defaultLang: 'en',
  langs: ['en', 'ru', 'tr'],

  sdk: null, player: null,
  _adActive: false, _lastAd: 0, _gameplay: false, _ready: false,
  _pauseCbs: [], _resumeCbs: [], _paused: false, _why: {},

  /* --------------------------- lifecycle -------------------------- */
  async init() {
    if (typeof YaGames === 'undefined') return;         // local run without the adapter
    try { this.sdk = await YaGames.init(); } catch (e) { this.sdk = null; return; }
    try { this.player = await this.sdk.getPlayer({ scopes: false }); } catch (e) { this.player = null; }
    this._bindPause();
  },

  firstFrame() { /* n/a */ },

  ready() {
    if (this._ready) return;
    this._ready = true;
    try { this.sdk && this.sdk.features.LoadingAPI && this.sdk.features.LoadingAPI.ready(); } catch (e) {}
  },

  gameplayStart() {
    if (this._gameplay) return;
    this._gameplay = true;
    try { this.sdk && this.sdk.features.GameplayAPI && this.sdk.features.GameplayAPI.start(); } catch (e) {}
  },
  gameplayStop() {
    if (!this._gameplay) return;
    this._gameplay = false;
    try { this.sdk && this.sdk.features.GameplayAPI && this.sdk.features.GameplayAPI.stop(); } catch (e) {}
  },

  /* ------------------------ pause / resume ------------------------ */
  /* A pause has independent sources; the game resumes only when ALL are gone:
       platform — game_api_pause / game_api_resume (Bridge pause state and
                  full-screen ads, sent by the adapter)
       hidden   — tab / page hidden
       blur     — the game frame lost focus (ignored while our own ad is open) */
  onPause(cb) {
    this._pauseCbs.push(cb);
    if (this._paused) { try { cb(); } catch (e) {} }      // paused before the game subscribed
  },
  onResume(cb) { this._resumeCbs.push(cb); },
  isPaused() { return this._paused; },

  _setPause(why, on) {
    if (on) this._why[why] = true; else delete this._why[why];
    const p = Object.keys(this._why).length > 0;
    if (p === this._paused) return;
    this._paused = p;
    (p ? this._pauseCbs : this._resumeCbs).slice().forEach(f => { try { f(); } catch (e) {} });
  },

  _bindPause() {
    try {
      this.sdk.on('game_api_pause', () => this._setPause('platform', true));
      this.sdk.on('game_api_resume', () => this._setPause('platform', false));
    } catch (e) {}
    const vis = () => this._setPause('hidden', !!document.hidden);
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', () => this._setPause('hidden', true));
    window.addEventListener('pageshow', vis);
    window.addEventListener('blur', () => { if (!this._adActive) this._setPause('blur', true); });
    window.addEventListener('focus', () => this._setPause('blur', false));
    if (document.hidden) vis();
  },

  /* --------------------------- language --------------------------- */
  /* The language the platform reports, if the game has it; otherwise null → English. */
  async getLanguage() {
    try {
      const l = String((this.sdk && this.sdk.environment.i18n.lang) || '').slice(0, 2).toLowerCase();
      if (l && this.langs.indexOf(l) >= 0) return l;
    } catch (e) {}
    return null;
  },
  storesLanguage: false,

  /* ----------------------------- audio ---------------------------- */
  audioEnabled() { return true; },          // platform audio state is applied by the adapter
  onAudioEnabledChange() { /* n/a */ },

  /* ----------------------------- saves ---------------------------- */
  /* Called after init(): player data (Bridge storage) + localStorage, which the adapter mirrors. */
  async loadData() {
    let cloud = null;
    if (this.player) {
      try {
        const d = await this.player.getData(['save']);
        if (d && d.save) cloud = d.save;
      } catch (e) {}
    }
    let local = null;
    try {
      const raw = localStorage.getItem('gbu_save_v2');
      if (raw) local = JSON.parse(raw);
    } catch (e) {}
    if (!cloud) return local;
    if (!local) return cloud;
    // keep the more advanced progress
    return (cloud.totalScore || 0) >= (local.totalScore || 0) ? cloud : local;
  },

  saveData(obj) {
    try { localStorage.setItem('gbu_save_v2', JSON.stringify(obj)); } catch (e) {}
    if (this.player) {
      try { Promise.resolve(this.player.setData({ save: obj }, true)).catch(() => {}); } catch (e) {}
    }
  },

  /* ------------------- leaderboard / sign-in: off ------------------ */
  async submitScore() { /* leaderboards are off in the Playgama build */ },
  isAnon() { return true; },
  async leaderboardEntries() { return null; },
  async auth() { return false; },           // sign-in is not offered on Playgama

  /* ------------------------------ ads ----------------------------- */
  adsReady() { return !!this.sdk; },

  _adv() { try { return window.bridge && window.bridge.isInitialized ? window.bridge.advertisement : null; } catch (e) { return null; } },

  /* rewarded buttons are shown only where the platform can play a rewarded video */
  rewardedAvailable() {
    if (!this.sdk) return false;
    const a = this._adv();
    return !(a && a.isRewardedSupported === false);
  },

  /* an interstitial can be requested: supported and no other ad is open */
  canInterstitial() {
    if (!this.sdk || this._adActive) return false;
    const a = this._adv();
    return !(a && a.isInterstitialSupported === false);
  },

  /* done(shown): shown is true only if the ad was actually displayed */
  interstitial(done) {
    if (!this.canInterstitial()) { done(false); return; }
    this._adActive = true;
    this.gameplayStop();
    let fired = false;
    const fin = (shown) => {
      if (fired) return;
      fired = true;
      this._adActive = false;
      this._lastAd = Date.now();
      Game.onAdClose();
      done(!!shown);
    };
    try {
      this.sdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => { this._lastAd = Date.now(); Game.onAdOpen(); },
          onClose: (wasShown) => fin(wasShown),
          onError: () => fin(false),
          onOffline: () => fin(false)
        }
      });
    } catch (e) { fin(false); }
  },

  /* The reward is granted only if onRewarded fired (after the ad is closed);
     cancel / error / unsupported → no reward, the game simply continues. */
  rewarded(rewardId, onReward, onEnd) {
    if (!this.sdk || this._adActive) { onEnd && onEnd(false); return; }
    this._adActive = true;
    this.gameplayStop();
    Game.onAdOpen();
    let got = false, fired = false;
    const fin = () => {
      if (fired) return;
      fired = true;
      this._adActive = false;
      this._lastAd = Date.now();
      Game.onAdClose();
      if (got) { try { onReward(); } catch (e) {} }
      onEnd && onEnd(got);
    };
    try {
      this.sdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: () => { got = true; },
          onClose: fin,
          onError: fin
        }
      });
    } catch (e) { fin(); }
  },

  /* ----------------------------- health --------------------------- */
  logError() {},
  logWarning() {}
};
