'use strict';
/* =====================================================================
 *  Audio — recorded sound effects and looped music (audio/*.mp3).
 *  Every file is level-matched (effects peak-normalised, music -16 LUFS),
 *  so the gains below are the whole mix. See audio/CREDITS.txt.
 * ===================================================================== */

const Audio_ = {
  ctx: null, master: null, musicBus: null, sfxBus: null,
  started: false, muted: false, platformMuted: false,
  mode: 'menu', buffers: {}, track: null, _sim: false, _last: {},

  FILES: ['ui', 'coin', 'bump', 'land', 'fall', 'air', 'crash', 'laser', 'win', 'buy', 'deny',
          'roar', 'hitboss', 'bossdown', 'fanfare'],
  MUSIC: { menu: 'music_menu', run: 'music_run', boss: 'music_boss' },
  MUSIC_VOL: .34,

  /* ---------------------------- setup ---------------------------- */
  start() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.started = true;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._vol();
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.MUSIC_VOL;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = .9;
      this.sfxBus.connect(this.master);

      if (this.held()) this.ctx.suspend().catch(() => {});
      this._load();
    } catch (e) { this.ctx = null; }
  },

  /* effects first (small), then the track that is needed now, then the rest */
  async _load() {
    const get = async (name) => {
      if (this.buffers[name]) return;
      try {
        const res = await fetch('audio/' + name + '.mp3');
        if (!res.ok) return;
        const arr = await res.arrayBuffer();
        this.buffers[name] = await new Promise((ok, no) => {
          const p = this.ctx.decodeAudioData(arr, ok, no);
          if (p && p.then) p.then(ok, no);
        });
      } catch (e) { /* plays on without this sound */ }
    };
    await Promise.all(this.FILES.map(get));
    const order = [this.MUSIC[this.mode]].concat(Object.values(this.MUSIC));
    for (const name of order) { await get(name); this._syncMusic(); }
  },

  /* player's mute and platform's mute are independent */
  setMuted(v) { this.muted = !!v; this._apply(); },
  setPlatformMuted(v) { this.platformMuted = !!v; this._apply(); },
  _vol() { return (this.muted || this.platformMuted || this.held()) ? 0 : 1; },
  _apply(instant) {
    if (!this.master) return;
    const t = this.ctx.currentTime, g = this.master.gain;
    g.cancelScheduledValues(t);
    if (instant) g.setValueAtTime(this._vol(), t);
    else g.setTargetAtTime(this._vol(), t, .02);
  },

  /* Silence with reasons: 'pause' (player's pause), 'sys' (platform pause),
     'ad' (ad on screen). Sound returns only when no reason is left, so a
     platform resume can never un-silence a pause the player made. */
  _holds: {},
  held() { return Object.keys(this._holds).length > 0; },
  hold(why, on) {
    if (on) this._holds[why] = 1; else delete this._holds[why];
    const h = this.held();
    this._apply(h);
    if (!this.ctx) return;
    if (h) { if (this.ctx.state !== 'closed') this.ctx.suspend().catch(() => {}); }
    else this._wake();
  },
  /* a gesture: the browser may have blocked autoplay or kept the audio asleep after a pause */
  nudge() {
    if (!this.started) this.start();
    else if (!this.held()) this._wake();
  },
  _wake() {
    if (!this.ctx || this.held()) return;
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().then(() => this._syncMusic(), () => {});
    } else this._syncMusic();
  },

  /* ---------------------------- playback ------------------------- */
  play(name, vol, rate, gap) {
    if (!this.ctx || this._sim || this.held() || this.ctx.state !== 'running') return;
    const buf = this.buffers[name];
    if (!buf) return;
    const now = this.ctx.currentTime;
    if (this._last[name] !== undefined && now - this._last[name] < (gap == null ? .04 : gap)) return;
    this._last[name] = now;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = buf;
    s.playbackRate.value = rate || 1;
    g.gain.value = vol == null ? .7 : vol;
    s.connect(g); g.connect(this.sfxBus);
    s.start(now);
  },

  /* ------------------------------ sfx ---------------------------- */
  ui() { this.play('ui', .45, 1, .03); },
  coin(streak) { this.play('coin', .5, 1 + Math.min(streak || 0, 12) * .03, .03); },
  bump() { this.play('bump', .7, .95 + Math.random() * .1, .08); },
  land(v) { this.play('land', Math.min(.5, .12 + (v || 0) * .03), .9 + Math.random() * .15, .06); },
  fall() { this.play('fall', .65, 1, .3); },
  air() { this.play('air', .5, 1, .15); },
  crash() { this.play('crash', .7, 1, .1); },
  laser() { this.play('laser', .4, 1.1, .1); },
  win() { this.play('win', .75, 1, .5); },
  buy() { this.play('buy', .6, 1, .1); },
  deny() { this.play('deny', .45, 1, .1); },
  roar() { this.play('roar', .8, .7, .4); },
  hitBoss() { this.play('hitboss', .85, .9 + Math.random() * .15, .05); },
  bossDown() { this.play('bossdown', .8, 1, .5); this.play('fanfare', .65, 1, .5); },

  /* ---------------------------- music ---------------------------- */
  /* 'menu' | 'run' | 'boss': crossfades to that loop */
  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    this._syncMusic();
  },

  _syncMusic() {
    if (!this.ctx || this.held() || this.ctx.state !== 'running') return;
    const want = this.MUSIC[this.mode];
    if (this.track && this.track.name === want) return;
    const buf = want && this.buffers[want];
    if (!buf) return;                       // starts once the track has loaded
    const t = this.ctx.currentTime;
    if (this.track) {
      const old = this.track;
      try {
        old.gain.gain.cancelScheduledValues(t);
        old.gain.gain.setValueAtTime(old.gain.gain.value, t);
        old.gain.gain.linearRampToValueAtTime(.0001, t + .7);
        old.src.stop(t + .75);
      } catch (e) { /* ignore */ }
    }
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf; src.loop = true;
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(1, t + .9);
    src.connect(g); g.connect(this.musicBus);
    src.start(t);
    this.track = { name: want, src, gain: g };
  }
};
