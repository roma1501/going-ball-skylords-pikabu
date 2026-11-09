'use strict';
/* =====================================================================
 *  Going Ball Ultimated — ядро игры
 * ===================================================================== */

/* ============================== I18N ============================== */
const I18N = {
  ru: {
    play: 'Играть', shop: 'Скины', best: 'Рекорд', level: 'Уровень',
    coins: 'Монеты', bonus: 'Бонус', total: 'Итого', score: 'Счёт',
    paused: 'Пауза', pausedTitle: 'Игра на паузе', pausedSub: 'Нажми «Продолжить», чтобы вернуться в игру',
    resume: 'Продолжить', toMenu: 'В меню',
    gameOver: 'Падение', gameOverTitle: 'Мяч сорвался', revive: 'Продолжить', restart: 'Заново',
    levelComplete: 'Уровень пройден', x2: 'Удвоить награду', next: 'Дальше',
    hint: 'Веди пальцем или ← →', hintPc: 'Мышь или клавиши ← →',
    bossName: 'СТРАЖ', bossTip: 'Тарань его!', bossLvl: 'Босс', bonusLvl: 'Бонус',
    buy: 'Купить', select: 'Выбрать', selected: 'Выбран', vidTag: 'РЕКЛАМА',
    x2done: 'Награда удвоена', noCoins: 'Мало монет',
    /* rewarded-видео: текст обязан прямо говорить о рекламе и о награде */
    vidWatch: 'Смотреть рекламу', vidKicker: 'Реклама за награду',
    vidReviveReward: 'Награда: продолжить игру с места падения',
    vidX2Reward: 'Награда: монеты {c1} → {c2}, очки {s1} → {s2}',
    vidSkinReward: 'Награда: скин «{n}»',
    vidAsk: 'Посмотрите рекламный ролик до конца и получите награду:',
    cancel: 'Отмена', breakSoon: 'Реклама через'
  },
  en: {
    play: 'Play', shop: 'Skins', best: 'Best', level: 'Level',
    coins: 'Coins', bonus: 'Bonus', total: 'Total', score: 'Score',
    paused: 'Paused', pausedTitle: 'Game paused', pausedSub: 'Press Resume to get back in',
    resume: 'Resume', toMenu: 'Menu',
    gameOver: 'Dropped', gameOverTitle: 'The ball fell', revive: 'Continue', restart: 'Retry',
    levelComplete: 'Level clear', x2: 'Double reward', next: 'Next',
    hint: 'Swipe or use ← →', hintPc: 'Mouse or ← → keys',
    bossName: 'WARDEN', bossTip: 'Ram it!', bossLvl: 'Boss', bonusLvl: 'Bonus',
    buy: 'Buy', select: 'Select', selected: 'Selected', vidTag: 'AD',
    x2done: 'Reward doubled', noCoins: 'Not enough',
    vidWatch: 'Watch an ad', vidKicker: 'Ad for a reward',
    vidReviveReward: 'Reward: continue from where you fell',
    vidX2Reward: 'Reward: coins {c1} → {c2}, score {s1} → {s2}',
    vidSkinReward: 'Reward: “{n}” skin',
    vidAsk: 'Watch the video ad to the end and get your reward:',
    cancel: 'Cancel', breakSoon: 'Ad in'
  },
  tr: {
    play: 'Oyna', shop: 'Görünümler', best: 'Rekor', level: 'Seviye',
    coins: 'Para', bonus: 'Bonus', total: 'Toplam', score: 'Puan',
    paused: 'Duraklatıldı', pausedTitle: 'Oyun duraklatıldı', pausedSub: 'Dönmek için Devam’a bas',
    resume: 'Devam', toMenu: 'Menü',
    gameOver: 'Düştü', gameOverTitle: 'Top düştü', revive: 'Devam et', restart: 'Yeniden',
    levelComplete: 'Seviye tamam', x2: 'Ödülü ikiye katla', next: 'İleri',
    hint: 'Kaydır veya ← →', hintPc: 'Fare veya ← →',
    bossName: 'BEKÇİ', bossTip: 'Ona çarp!', bossLvl: 'Patron', bonusLvl: 'Bonus',
    buy: 'Al', select: 'Seç', selected: 'Seçili', vidTag: 'REKLAM',
    x2done: 'Ödül iki katı', noCoins: 'Yetersiz',
    vidWatch: 'Reklam izle', vidKicker: 'Ödül için reklam',
    vidReviveReward: 'Ödül: düştüğün yerden devam et',
    vidX2Reward: 'Ödül: para {c1} → {c2}, puan {s1} → {s2}',
    vidSkinReward: 'Ödül: “{n}” görünümü',
    vidAsk: 'Reklam videosunu sonuna kadar izleyin ve ödülünüzü alın:',
    cancel: 'İptal', breakSoon: 'Reklam'
  }
};
let LANG = 'en';
function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k; }
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  const lc = document.getElementById('lang-code');
  if (lc) lc.textContent = LANG.toUpperCase();
}

/* Совместимость SVG-иконок: старые Android WebView не понимают
   <use href="…"> (синтаксис SVG2) — только xlink:href. Дублируем атрибут,
   иначе иконки (монета, звезда и т.д.) не отображаются у части игроков. */
const XLINK_NS = 'http://www.w3.org/1999/xlink';
function fixIcons(root) {
  const uses = (root || document).getElementsByTagName('use');
  for (let i = 0; i < uses.length; i++) {
    const u = uses[i], h = u.getAttribute('href');
    if (h && !u.getAttributeNS(XLINK_NS, 'href')) u.setAttributeNS(XLINK_NS, 'href', h);
  }
}

/* ============================== SAVE ============================== */
const save = { level: 1, totalScore: 0, coins: 0, muted: false, lang: null, skins: ['classic'], skin: 'classic' };
let saveTimer = null;
function persist(now) {
  clearTimeout(saveTimer);
  const go = () => Platform.saveData(save);
  if (now) go(); else saveTimer = setTimeout(go, 400);
}

/* ============================== SKINS ============================= */
function chevrons(g, w, h, color, lw) {
  g.strokeStyle = color; g.lineWidth = lw || 30; g.lineJoin = 'miter'; g.lineCap = 'butt';
  const mid = h * .5, sp = h * .21, st = w / 4;
  for (let i = 0; i < 4; i++) {
    const x = i * st + st * .16;
    g.beginPath();
    g.moveTo(x, mid - sp); g.lineTo(x + st * .34, mid + sp); g.lineTo(x + st * .68, mid - sp);
    g.stroke();
  }
}

const SKINS = [
  { id: 'classic', price: 0, rarity: 0, trail: '#4dffc3', rough: .35, metal: .35, emis: 0x082018, emisI: .5,
    name: { ru: 'Классика', en: 'Classic', tr: 'Klasik' },
    draw(g, w, h) {
      g.fillStyle = '#1d2030'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(.5, 'rgba(0,0,0,.2)'); gr.addColorStop(1, 'rgba(255,255,255,.1)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e9edf8'; g.fillRect(0, h * .15, w, h * .075); g.fillRect(0, h * .775, w, h * .075);
      chevrons(g, w, h, '#4dffc3');
    } },
  { id: 'beach', price: 250, rarity: 1, trail: '#ffd7a0', rough: .4, metal: .05, emis: 0x000000, emisI: 0,
    name: { ru: 'Пляж', en: 'Beach', tr: 'Plaj' },
    draw(g, w, h) {
      const cols = ['#f2453d', '#fdfdfd', '#2f80e8', '#ffd23e', '#fdfdfd', '#37c65c'];
      const sw = w / cols.length;
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * sw, 0, sw + 1, h); });
      g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 0, w, h * .05); g.fillRect(0, h * .95, w, h * .05);
    } },
  { id: 'melon', price: 400, rarity: 1, trail: '#9dff6b', rough: .55, metal: 0, emis: 0x001200, emisI: .2,
    name: { ru: 'Арбуз', en: 'Melon', tr: 'Karpuz' },
    draw(g, w, h) {
      g.fillStyle = '#1f9e3a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#0a4d18'; g.lineWidth = 16;
      for (let i = 0; i < 8; i++) {
        const x = (i + .5) * (w / 8);
        g.beginPath(); g.moveTo(x, 0);
        g.bezierCurveTo(x + 20, h * .3, x - 20, h * .7, x, h);
        g.stroke();
      }
      g.fillStyle = 'rgba(190,255,170,.22)'; g.fillRect(0, 0, w, h * .1);
    } },
  { id: 'flame', price: 600, rarity: 2, trail: '#ff8a2b', rough: .3, metal: .4, emis: 0x461000, emisI: 1,
    name: { ru: 'Пламя', en: 'Flame', tr: 'Alev' },
    draw(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#280d06'); gr.addColorStop(.5, '#5c1c06'); gr.addColorStop(1, '#280d06');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffb02e'; g.fillRect(0, h * .15, w, h * .05); g.fillRect(0, h * .8, w, h * .05);
      chevrons(g, w, h, '#ff5a1f', 30);
      chevrons(g, w, h, 'rgba(255,222,90,.85)', 11);
    } },
  { id: 'ocean', price: 600, rarity: 2, trail: '#5ec8ff', rough: .12, metal: .6, emis: 0x032033, emisI: .5,
    name: { ru: 'Океан', en: 'Ocean', tr: 'Okyanus' },
    draw(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#062a63'); gr.addColorStop(.5, '#1d7ad1'); gr.addColorStop(1, '#062a63');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 9;
      for (let r = 0; r < 4; r++) {
        const y = h * (.22 + r * .19);
        g.beginPath();
        for (let x = 0; x <= w; x += 6) g[x ? 'lineTo' : 'moveTo'](x, y + Math.sin((x / w) * 18 + r) * 9);
        g.stroke();
      }
    } },
  { id: 'galaxy', price: 900, rarity: 3, trail: '#b46bff', rough: .25, metal: .5, emis: 0x1a0a3a, emisI: .8,
    name: { ru: 'Галактика', en: 'Galaxy', tr: 'Galaksi' },
    draw(g, w, h) {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#0b0722'); gr.addColorStop(.5, '#2c1068'); gr.addColorStop(1, '#0b0722');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const neb = g.createRadialGradient(w * .6, h * .45, 4, w * .6, h * .45, w * .32);
      neb.addColorStop(0, 'rgba(210,100,255,.55)'); neb.addColorStop(.55, 'rgba(90,60,220,.28)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 190; i++) {
        g.globalAlpha = .35 + Math.random() * .65;
        g.fillStyle = ['#fff', '#9fd6ff', '#ffc9f2'][Math.floor(Math.random() * 3)];
        const s = Math.random() < .86 ? 2 : 4;
        g.fillRect(Math.random() * w, Math.random() * h, s, s);
      }
      g.globalAlpha = 1;
    } },
  { id: 'gold', price: 1200, rarity: 3, trail: '#ffd76a', rough: .12, metal: 1, emis: 0x2e1d00, emisI: .35,
    name: { ru: 'Золото', en: 'Gold', tr: 'Altın' },
    draw(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#8a5a08'); gr.addColorStop(.32, '#ffe07a'); gr.addColorStop(.52, '#c98f1b');
      gr.addColorStop(.72, '#ffe89a'); gr.addColorStop(1, '#8a5a08');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.6)';
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * w, y = Math.random() * h, s = 3 + Math.random() * 6;
        g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .3, y); g.lineTo(x, y + s); g.lineTo(x - s * .3, y);
        g.closePath(); g.fill();
      }
    } },
  { id: 'neon', price: 1500, ad: true, rarity: 3, trail: '#29f4ff', rough: .2, metal: .3, emis: 0x00323d, emisI: 1.4,
    name: { ru: 'Неон', en: 'Neon', tr: 'Neon' },
    draw(g, w, h) {
      g.fillStyle = '#05060e'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(41,244,255,.35)'; g.lineWidth = 2;
      for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      chevrons(g, w, h, '#ff3df2', 20);
      chevrons(g, w, h, 'rgba(41,244,255,.95)', 7);
    } }
];

const RARITY = ['#93a2c6', '#59c8ff', '#a77bff', '#ffc53d'];
function skinById(id) { return SKINS.find(s => s.id === id) || SKINS[0]; }
function skinTex(id) {
  const s = skinById(id);
  return Tex.make('skin_' + id, 1024, 512, (g, w, h) => s.draw(g, w, h));
}
function skinThumb(id) {
  const key = 'thumb_' + id;
  if (Tex._c[key]) return Tex._c[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(64, 64, 63, 0, 6.284); g.clip();
  g.drawImage(skinTex(id).image, 256, 0, 512, 512, 0, 0, 128, 128);
  const hl = g.createRadialGradient(42, 36, 4, 64, 64, 92);
  hl.addColorStop(0, 'rgba(255,255,255,.5)');
  hl.addColorStop(.4, 'rgba(255,255,255,.05)');
  hl.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = hl; g.fillRect(0, 0, 128, 128);
  const url = c.toDataURL();
  Tex._c[key] = url;
  return url;
}

/* ============================== BALL ============================== */
const ball = {
  x: 0, y: BALL_R, z: 0, prevY: BALL_R, vy: 0, grounded: true,
  targetX: 0, slope: 0, vxs: 0, spin: 0,
  kbx: 0, kbz: 0, kbt: 0, boost: 1, inv: 0, coyote: 0, squash: 0
};
let ballMesh = null, contact = null;

function applySkin(id) {
  const s = skinById(id);
  const m = ballMesh.material;
  m.map = skinTex(id);
  m.roughness = s.rough;
  m.metalness = s.metal;
  m.emissive = C(s.emis);
  m.emissiveIntensity = s.emisI;
  m.needsUpdate = true;
  FX.setTrailColor(s.trail);
}

/* ============================== GAME ============================== */
const Game = {
  state: 'boot',            // boot|menu|playing|paused|over|win
  time: 0, runCoins: 0, streak: 0, streakT: 0,
  pendingScore: 0, pendingCoins: 0, deathZ: 0,
  shake: 0, sim: false, adPause: false, _acc: 0,
  sysPaused: false,         // platform pause (game_api_pause, tab hidden, focus lost): loop, input, audio stopped
  _sysOverlay: false, _revived: false, _drag: false,

  speed(n) { return Math.min(12.2 + (n || save.level) * .34, 18.5); },

  /* --------------------------- boot --------------------------- */
  async boot() {
    Gfx.init(document.getElementById('c'));
    FX.init(Gfx.scene);

    ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 40, 28),
      new THREE.MeshStandardMaterial({ roughness: .35, metalness: .35, envMapIntensity: 1.1 })
    );
    ballMesh.castShadow = true;
    Gfx.scene.add(ballMesh);

    contact = new THREE.Mesh(
      new THREE.PlaneGeometry(BALL_R * 3.4, BALL_R * 3.4),
      new THREE.MeshBasicMaterial({ map: Tex.softShadow(), transparent: true, depthWrite: false, opacity: .7 })
    );
    contact.rotation.x = -Math.PI / 2;
    Gfx.scene.add(contact);

    this.setProgress(.25);
    Platform.firstFrame();

    await Platform.init();
    this.setProgress(.5);

    // save is read only after YaGames.init() resolved (adapter storage is loaded by then)
    const cloud = await Platform.loadData();
    if (cloud) Object.assign(save, cloud);
    if (!Array.isArray(save.skins) || !save.skins.length) save.skins = ['classic'];
    if (save.skins.indexOf(save.skin) < 0) save.skin = 'classic';
    save.level = Math.max(1, save.level | 0);

    const pl = await Platform.getLanguage();
    LANG = (pl && I18N[pl]) ? pl : 'en';      // platform language if supported, otherwise English
    applyI18n();
    this.setProgress(.7);

    document.body.classList.toggle('no-vid', !Platform.adsReady());
    Audio_.setMuted(!!save.muted);
    Audio_.setPlatformMuted(!Platform.audioEnabled());
    Platform.onAudioEnabledChange(on => Audio_.setPlatformMuted(!on));
    Platform.onPause(() => this.sysPause());
    Platform.onResume(() => this.sysResume());

    this.bindUI();
    this.bindInput();
    applySkin(save.skin);

    Level.build(save.level);
    this.resetBall(0);
    this.snapCam();
    this.setProgress(1);

    fixIcons();                // xlink-совместимость всех статичных SVG-иконок
    this._acc = 0;
    this.last = performance.now();
    requestAnimationFrame(() => this.loop());
    setTimeout(() => {
      this.showMenu();
      Platform.ready();       // только когда меню реально интерактивно
    }, 260);
  },

  setProgress(p) {
    document.getElementById('load-fill').style.width = Math.round(p * 100) + '%';
    document.getElementById('load-pct').textContent = Math.round(p * 100);
  },

  /* --------------------------- flow ---------------------------- */
  showMenu() {
    Audio_.hold('pause', false);
    Audio_.setMode('menu');
    if (level) { this.resetBall(0); this.snapCam(); }
    document.getElementById('menu-best').textContent = save.totalScore;
    document.getElementById('menu-level').textContent = save.level;
    document.getElementById('menu-coins').textContent = save.coins;
    this.screen('scr-menu');
    this.state = 'menu';
    Platform.gameplayStop();
  },

  start(n) {
    Level.build(n);
    this.resetBall(0);
    this.time = 0; this.runCoins = 0; this.streak = 0;
    this.pendingScore = 0; this.pendingCoins = 0;
    this._revived = false;                 // rewarded revive: at most once per level attempt
    ball.inv = 0;
    FX.reset();
    this.hud();

    const chip = document.getElementById('chip-level');
    chip.querySelector('span').textContent = level.isBoss ? t('bossLvl') : level.isBonus ? t('bonusLvl') : n;
    const bh = document.getElementById('boss-hud');
    if (level.isBoss) {
      bh.classList.remove('hidden');
      document.getElementById('boss-hp-max').textContent = level.boss.maxHp;
      document.getElementById('boss-hp-cur').textContent = level.boss.hp;
      document.getElementById('boss-fill').style.width = '100%';
      const nt = document.getElementById('boss-notches');
      nt.innerHTML = '';
      for (let i = 0; i < level.boss.maxHp; i++) nt.appendChild(document.createElement('i'));
    } else bh.classList.add('hidden');

    this.screen(null);
    document.getElementById('hud').classList.remove('hidden');
    this.banner(
      level.isBoss ? t('bossLvl') : level.isBonus ? t('bonusLvl') : t('level'),
      level.isBoss ? t('bossName') : String(n)
    );
    this.hint();
    this.state = 'playing';
    Audio_.hold('pause', false);
    Audio_.setMode(level.isBoss ? 'boss' : 'run');
    Platform.gameplayStart();
    this.snapCam();
    if (this.sysPaused) this._showSysOverlay();   // started while the platform is paused: wait for resume
  },

  screen(id) {
    ['scr-load', 'scr-menu', 'scr-shop', 'scr-pause', 'scr-over', 'scr-win', 'scr-offer']
      .forEach(s => {
        const el = document.getElementById(s);      // some builds lack some screens
        if (el) el.classList.toggle('hidden', s !== id);
      });
    if (id) document.getElementById('hud').classList.add('hidden');
    if (id !== 'scr-win') document.getElementById('confetti').innerHTML = '';
  },

  banner(kick, title) {
    const b = document.getElementById('lvl-intro');
    document.getElementById('intro-kicker').textContent = kick;
    document.getElementById('intro-title').textContent = title;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.add('hidden'), 2100);
  },

  hint() {
    const h = document.getElementById('hint');
    const touch = matchMedia('(hover: none)').matches;
    document.getElementById('hint-text').textContent = touch ? t('hint') : t('hintPc');
    h.classList.remove('hidden');
    clearTimeout(this._ht);
    this._ht = setTimeout(() => h.classList.add('hidden'), 3200);
  },

  toast(txt) {
    if (this.sim) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = '<svg class="ic"><use href="#i-coin"/></svg>';
    fixIcons(d);
    d.appendChild(document.createTextNode(txt));
    document.getElementById('toasts').appendChild(d);
    setTimeout(() => d.remove(), 1500);
  },

  hud() {
    if (this.sim) return;
    document.getElementById('hud-score').textContent = save.totalScore + this.runCoins * 10;
    document.getElementById('hud-coins').textContent = this.runCoins;
  },

  /* --------------------------- pause --------------------------- */
  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      keys.l = keys.r = false; this._drag = false;
      Audio_.hold('pause', true);
      Platform.gameplayStop();
      persist(true);
      this.screen('scr-pause');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      Audio_.hold('pause', false);
      Platform.gameplayStart();
      this.screen(null);
      document.getElementById('hud').classList.remove('hidden');
    }
  },

  /* Leaving a finished run (win or fall) with Next / Retry / Menu. After every
     2 finished runs the interstitial is shown right away on that press. If the
     platform did not show it, the count stays and the next press tries again.
     `prep` runs once per press (bank/advance), `go` after the ad. */
  transition(prep, go) {
    if (this._transit) return;
    this._transit = true;
    prep();
    const done = () => { this._transit = false; go(); };
    this._runs = (this._runs || 0) + 1;
    if (this._runs < 2 || !Platform.canInterstitial()) { done(); return; }
    Platform.interstitial(shown => { if (shown) this._runs = 0; done(); });
  },

  /* UI locked: player's pause, platform pause or an ad */
  uiLocked() {
    return this.state === 'paused' || this.sysPaused || this.adPause;
  },

  /* Platform pause (game_api_pause, tab hidden, focus lost, full-screen ad):
     the game loop, physics, timers, input and audio stop; the logical state
     (menu / playing / paused / over / win) is kept and restored on resume. */
  sysPause() {
    if (this.sysPaused) return;
    this.sysPaused = true;
    keys.l = keys.r = false; this._drag = false;
    Audio_.hold('sys', true);
    persist(true);
    if (this.state === 'playing') this._showSysOverlay();
  },
  _showSysOverlay() {
    this._sysOverlay = true;
    Platform.gameplayStop();
    document.getElementById('scr-pause').classList.add('sys');   // no buttons: resume comes from the platform
    this.screen('scr-pause');
  },
  sysResume() {
    if (!this.sysPaused) return;
    this.sysPaused = false;
    if (this._sysOverlay) {
      this._sysOverlay = false;
      document.getElementById('scr-pause').classList.remove('sys');
      if (this.state === 'playing') {
        this.screen(null);
        document.getElementById('hud').classList.remove('hidden');
        Platform.gameplayStart();
      }
    }
    Audio_.hold('sys', false);       // a pause the player made keeps its own 'pause' hold
    if (this._halted) {              // restart the stopped loop without a time jump
      this._halted = false;
      this.last = performance.now();
      this._acc = 0;
      requestAnimationFrame(() => this.loop());
    }
  },
  onAdOpen() { this.adPause = true; keys.l = keys.r = false; this._drag = false; Audio_.hold('ad', true); },
  onAdClose() { this.adPause = false; Audio_.hold('ad', false); },

  /* ---------------------------- ball --------------------------- */
  resetBall(z, x) {
    const px = x || 0;
    ball.x = px; ball.targetX = px; ball.z = z;
    const f = Level.floorAt(px, z);
    ball.y = ball.prevY = (f ? f.y : 0) + BALL_R;
    ball.vy = 0; ball.grounded = true; ball.slope = 0; ball.vxs = 0;
    ball.kbx = ball.kbz = ball.kbt = 0; ball.boost = 1; ball.squash = 0; ball.coyote = 0;
    ballMesh.visible = true;
    ballMesh.position.set(ball.x, ball.y, ball.z);
    ballMesh.scale.set(1, 1, 1);
    ballMesh.quaternion.identity();
  },

  updateBall(dt) {
    const S = this.speed();
    this.time += dt;
    if (ball.inv > 0) ball.inv -= dt;
    if (this.streakT > 0) { this.streakT -= dt; if (this.streakT <= 0) this.streak = 0; }

    if (ball.kbt > 0) {
      ball.kbt -= dt;
      ball.z += ball.kbz * dt; ball.x += ball.kbx * dt;
      ball.kbz *= Math.max(0, 1 - 4.5 * dt); ball.kbx *= Math.max(0, 1 - 4.5 * dt);
      ball.boost = 0;
      ball.targetX = ball.x;
    } else ball.boost = Math.min(1, ball.boost + dt * 1.7);

    const dz = -S * ball.boost * dt;
    ball.z += dz;

    if (keys.l) ball.targetX -= 9.5 * dt;
    if (keys.r) ball.targetX += 9.5 * dt;

    // зоны толкания (ветер / лента)
    for (const tr of level.traps) if (tr.push) tr.push(ball, dt);

    ball.targetX = Math.max(-HALF + BALL_R * .6, Math.min(HALF - BALL_R * .6, ball.targetX));
    const vx = Math.max(-12, Math.min(12, (ball.targetX - ball.x) * 13));
    const dx = vx * dt;
    ball.x += dx;
    ball.vxs += (vx - ball.vxs) * Math.min(1, dt * 6);

    ball.prevY = ball.y;
    const f = Level.floorAt(ball.x, ball.z);

    if (ball.grounded) {
      if (f && ball.y - BALL_R <= f.y + .35) {
        ball.y = f.y + BALL_R;
        ball.vy = 0;
        ball.coyote = .08;
        const p = f.p;
        ball.slope = p.zMax !== p.zMin ? ((p.y1 - p.y0) / (p.zMax - p.zMin)) * S * ball.boost : 0;
        if (p.touch) p.touch();
        if (p.rail) {
          if (ball.x < p.x0 + BALL_R) { ball.x = p.x0 + BALL_R; if (ball.targetX < ball.x) ball.targetX = ball.x; }
          if (ball.x > p.x1 - BALL_R) { ball.x = p.x1 - BALL_R; if (ball.targetX > ball.x) ball.targetX = ball.x; }
        }
      } else {
        ball.coyote -= dt;
        if (ball.coyote <= 0) {
          ball.grounded = false;
          ball.vy = ball.slope > .5 ? ball.slope : 0;
          if (ball.slope > .5 && !this.sim) Audio_.air();
        }
      }
    }
    if (!ball.grounded) {
      ball.vy -= GRAV * dt;
      ball.y += ball.vy * dt;
      const f2 = Level.floorAt(ball.x, ball.z);
      if (f2 && ball.vy <= 0) {
        const bot = ball.y - BALL_R, pbot = ball.prevY - BALL_R;
        if ((pbot >= f2.y - .001 && bot <= f2.y) || (bot <= f2.y + .02 && bot >= f2.y - .62)) {
          const impact = -ball.vy;
          ball.y = f2.y + BALL_R;
          ball.vy = 0;
          ball.grounded = true;
          ball.coyote = .08;
          if (f2.p.touch) f2.p.touch();
          if (impact > 4) {
            ball.squash = Math.min(.35, impact * .022);
            if (!this.sim) { Audio_.land(impact); FX.burst(ball.x, f2.y + .1, ball.z, '#ffffff', 4, 1.6, 14); }
          }
        }
      }
    }

    /* ловушки */
    const canHit = ball.inv <= 0 && ball.kbt <= 0;
    for (const tr of level.traps) {
      tr.update(dt, this.time);
      if (!canHit) continue;
      const r = tr.hit(ball);
      if (!r) continue;
      if (r.crash) {
        if (!this.sim) {
          FX.rubble(Math.max(-HALF, r.x - 1.7), Math.min(HALF, r.x + 1.7), tr.z, 0);
          FX.burst(r.x, 1, tr.z, '#c9714f', 8, 3.5);
          Audio_.crash();
        }
        this.shake = .28;
        ball.boost = .3;
      } else {
        this.knock(r.vx, r.vz, r);
      }
    }

    /* динамический пол */
    for (const p of level.dyn) p.update(dt, this.time);

    /* монеты */
    for (const c of level.coins) {
      if (c.taken || Math.abs(c.z - ball.z) > 1.3) continue;
      const dx2 = c.x - ball.x, dz2 = c.z - ball.z, dy2 = c.baseY - ball.y;
      if (dx2 * dx2 + dz2 * dz2 < .95 && Math.abs(dy2) < 1.15) {
        c.taken = true; c.m.visible = false; c.g.visible = false;
        this.runCoins++;
        this.streak++; this.streakT = 1.2;
        if (!this.sim) {
          FX.burst(c.x, c.baseY, c.z, '#ffc53d', 7, 2.6);
          Audio_.coin(this.streak);
          if (this.streak > 0 && this.streak % 15 === 0) this.toast('×' + this.streak);
        }
        this.hud();
      }
    }

    /* босс */
    if (level.boss) this.updateBoss(dt);

    /* след */
    if (!this.sim && ball.boost > .35 && ball.grounded) {
      this._tr = (this._tr || 0) + dt;
      if (this._tr > .028) { this._tr = 0; FX.emitTrail(ball.x, ball.y, ball.z, 1); }
    }

    if (ball.z <= level.finishZ) { this.win(); return; }
    if (ball.y < -9) { this.fall(); return; }

    /* визуал мяча */
    if (!this.sim) {
      ballMesh.position.set(ball.x, ball.y, ball.z);
      ballMesh.rotateOnWorldAxis(AX, dz / BALL_R);
      ballMesh.rotateOnWorldAxis(AZ, -dx / BALL_R);
      ball.squash = Math.max(0, ball.squash - dt * 1.6);
      const sq = ball.squash;
      ballMesh.scale.set(1 + sq * .5, 1 - sq, 1 + sq * .5);
      ballMesh.visible = !(ball.inv > 0 && Math.floor(ball.inv * 9) % 2 === 0);
      const fs = Level.floorAt(ball.x, ball.z);
      if (fs) {
        contact.visible = true;
        contact.position.set(ball.x, fs.y + .04, ball.z);
        const h = Math.max(0, ball.y - BALL_R - fs.y);
        const k = Math.max(.35, 1 - h * .16);
        contact.scale.set(k, k, 1);
        contact.material.opacity = .7 * k;
      } else contact.visible = false;
    }
  },

  knock(vx, vz, info) {
    ball.kbx = vx; ball.kbz = vz; ball.kbt = info && info.bumper ? .3 : .42;
    ball.targetX = ball.x;
    ball.inv = .75;
    this.shake = .3;
    if (this.sim) return;
    Audio_.bump();
    if (info && info.laser) Audio_.laser();
    FX.burst(ball.x, ball.y, ball.z, info && info.spark ? '#ffd76a' : '#ff6a4d', 6, 2.4);
  },

  /* --------------------------- boss ---------------------------- */
  updateBoss(dt) {
    const b = level.boss, S = this.speed();
    b.time += dt;
    b.aura.material.opacity = .35 + Math.sin(b.time * 5) * .12;

    if (b.state === 'dying') {
      b.deathT -= dt;
      const k = Math.max(.04, b.deathT / 1.3);
      b.g.scale.setScalar(k);
      b.g.rotation.y += dt * 9;
      b.g.position.y = 1.6 * k;
      if (!this.sim && Math.random() < .3) FX.burst(b.x + (Math.random() - .5) * 2, 1.5, b.z, '#ff5a2a', 3, 3);
      if (b.deathT <= 0) b.g.visible = false;
      return;
    }
    if (b.inv > 0) b.inv -= dt;
    const gap = ball.z - b.z;

    if (b.state === 'run') {
      const aligned = Math.abs(ball.x - b.x) < 1.8;
      b.z -= ((gap < 3.2 && !aligned) ? S * ball.boost : S * .72) * dt;
      b.x = Math.sin(b.time * 1.05) * 1.9;
      b.next -= dt;
      if (b.next <= 0) { b.state = 'tell'; b.t = .75; b.chargeX = ball.x; if (!this.sim) Audio_.roar(); }
      if (gap < -1.2) { b.state = 'back'; b.t = 2.5; b.inv = 1; }
    } else if (b.state === 'tell') {
      b.t -= dt;
      b.z -= S * ball.boost * dt;
      b.x += (b.chargeX - b.x) * Math.min(1, dt * 6);
      b.body.material.emissiveIntensity = Math.floor(b.t * 14) % 2 ? 3.2 : 1;
      if (b.t <= 0) { b.state = 'charge'; b.body.material.emissiveIntensity = 1; }
    } else if (b.state === 'charge') {
      b.z += 27 * dt;
      b.x += (b.chargeX - b.x) * Math.min(1, dt * 8);
      const dx = ball.x - b.x, dz = ball.z - b.z;
      if (dx * dx + dz * dz < 4.6 && ball.kbt <= 0 && ball.inv <= 0) this.knock(ball.x > b.x ? 7 : -7, 13);
      if (b.z > ball.z + 9) { b.state = 'back'; b.t = 2.5; b.inv = 1; }
    } else if (b.state === 'back') {
      b.t -= dt;
      b.z -= S * 1.9 * dt;
      const side = ball.x >= 0 ? -2.2 : 2.2;
      b.x += (side - b.x) * Math.min(1, dt * 4);
      // у стены арены обгон невозможен — не зависаем, возвращаемся в бой
      if (ball.z - b.z > 10 || b.t <= 0 || b.z <= level.wall.z + 6.6) {
        b.state = 'run';
        b.next = 4 + Math.random() * 2;
      }
    } else if (b.state === 'flee') {
      b.t -= dt;
      b.z -= S * 1.7 * dt;
      if (b.t <= 0) { b.state = 'run'; b.next = 4.5 + Math.random() * 2.5; }
    }

    if (b.z < level.wall.z + 6.5) b.z = level.wall.z + 6.5;
    b.x = Math.max(-2.3, Math.min(2.3, b.x));

    /* таран */
    if ((b.state === 'run' || b.state === 'tell') && b.inv <= 0) {
      const dx = ball.x - b.x, dz = ball.z - b.z;
      if (dx * dx + dz * dz < 4.5) {
        b.hp--;
        b.inv = 1.15;
        this.shake = .4;
        ball.kbx = 0; ball.kbz = 6; ball.kbt = .28;
        if (!this.sim) {
          Audio_.hitBoss();
          FX.burst(b.x, 1.7, b.z, '#ff5040', 10, 4.5);
          FX.burst(b.x, 1.2, b.z + .6, '#ffd76a', 6, 3);
          document.getElementById('boss-fill').style.width = Math.max(0, (b.hp / b.maxHp) * 100) + '%';
          document.getElementById('boss-hp-cur').textContent = Math.max(0, b.hp);
        }
        if (b.hp <= 0) { this.bossDown(); return; }
        b.state = 'flee'; b.t = 1.15;
      }
    }

    b.g.position.set(b.x, 1.6 + Math.sin(b.time * 3) * .12, b.z);
    b.g.rotation.z = Math.sin(b.time * .9) * .16;
    b.face.lookAt(ball.x, b.g.position.y, ball.z + 4);
  },

  bossDown() {
    const b = level.boss;
    b.state = 'dying'; b.deathT = 1.3; b.dead = true;
    level.traps = level.traps.filter(x => !x.wall);
    if (level.wall) { level.wall.m.visible = false; level.wall.glow.visible = false; }
    const fz = ball.z - 40;
    level.finishZ = fz;
    if (level.gate) level.gate.position.z = fz;
    if (this.sim) return;
    Audio_.bossDown();
    Audio_.setMode('run');
    FX.burst(b.x, 1.8, b.z, '#ff5040', 14, 6);
    FX.burst(b.x, 1.2, b.z, '#ffd76a', 10, 5);
    this.shake = .6;
    document.getElementById('boss-hud').classList.add('hidden');
  },

  /* -------------------------- results -------------------------- */
  fall() {
    this.deathZ = ball.z;
    this.state = 'over';
    if (this.sim) return;
    Audio_.fall();
    Platform.gameplayStop();
    document.getElementById('over-score').textContent = save.totalScore + this.runCoins * 10;
    document.getElementById('over-coins').textContent = this.runCoins;
    const rv = document.getElementById('btn-revive');
    rv.disabled = false;
    rv.style.display = (!this._revived && Platform.rewardedAvailable()) ? '' : 'none';   // once per level
    this.screen('scr-over');
  },

  win() {
    this.state = 'win';
    if (this.sim) return;
    Audio_.win();
    Platform.gameplayStop();
    const bonus = 100 + save.level * 25 + (level.isBoss ? 250 : 0);
    this.pendingScore = this.runCoins * 10 + bonus;
    this.pendingCoins = this.runCoins;
    document.getElementById('win-level').textContent = save.level;
    document.getElementById('win-kicker').textContent = t('levelComplete');
    document.getElementById('win-coins').textContent = this.pendingCoins;
    document.getElementById('win-bonus').textContent = bonus;
    document.getElementById('win-total').textContent = this.pendingScore;
    const x2 = document.getElementById('btn-x2');
    x2.disabled = false;
    x2.style.display = Platform.rewardedAvailable() ? '' : 'none';
    // на кнопке RV пишем конкретную награду: было → станет
    const rw = document.getElementById('x2-prize');
    if (rw) rw.textContent = this.x2RewardText();
    this.screen('scr-win');
    this.confetti();
  },

  /* «Награда: монеты 44 → 88, очки 345 → 690» — игрок видит, что именно получит */
  x2RewardText() {
    return t('vidX2Reward')
      .replace('{c1}', this.pendingCoins).replace('{c2}', this.pendingCoins * 2)
      .replace('{s1}', this.pendingScore).replace('{s2}', this.pendingScore * 2);
  },

  /* Диалог перед rewarded-видео: прямо сообщает, что будет показана реклама,
     и какая именно награда за неё положена (требование п. 4.5.1). */
  askAd(rewardText, onConfirm, backScreen) {
    const box = document.getElementById('scr-offer');
    if (!box) { onConfirm(); return; }           // страховка, если экрана нет
    document.getElementById('offer-prize').textContent = rewardText;
    this._adConfirm = onConfirm;
    this._adBack = backScreen || 'scr-menu';
    this.screen('scr-offer');
  },

  bank() {
    if (this.runCoins > 0) {
      save.totalScore += this.runCoins * 10;
      save.coins += this.runCoins;
      this.runCoins = 0;
      persist(true);
      Platform.submitScore(save.totalScore);
    }
  },

  advance() {
    save.totalScore += this.pendingScore;
    save.coins += this.pendingCoins;
    save.level += 1;
    this.pendingScore = this.pendingCoins = this.runCoins = 0;
    persist(true);
    Platform.submitScore(save.totalScore);
  },

  /* возрождение чуть ПОЗАДИ места падения, но только там, где есть разбег */
  respawn() {
    const xs = [0, -1, 1, -1.8, 1.8, -2.4, 2.4];
    const z0 = Math.min(4, this.deathZ + 9);
    for (let pass = 0; pass < 2; pass++) {
      for (let z = z0; z <= 4.01; z += 2) {
        for (const x of xs) {
          if (!Level.floorAt(x, z)) continue;
          if (pass === 0 && !(Level.floorAt(x, z - 2.5) && Level.floorAt(x, z - 5))) continue;
          this.resetBall(z, x);
          ball.inv = 2.2;
          this.snapCam();
          return;
        }
      }
    }
    this.resetBall(0);
    ball.inv = 2.2;
    this.snapCam();
  },

  confetti() {
    const box = document.getElementById('confetti');
    box.innerHTML = '';
    const cols = ['#4dffc3', '#ffc53d', '#ff5d8f', '#59c8ff', '#a77bff', '#ffffff'];
    for (let i = 0; i < 54; i++) {
      const p = document.createElement('div');
      p.className = 'conf';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = cols[Math.floor(Math.random() * cols.length)];
      p.style.animationDuration = (1.7 + Math.random() * 2) + 's';
      p.style.animationDelay = (Math.random() * .8) + 's';
      p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      box.appendChild(p);
    }
  },

  /* --------------------------- camera -------------------------- */
  snapCam() {
    const c = Gfx.camera;
    c.position.set(ball.x * .5, Math.max(ball.y, 0) + 4.8, ball.z + 8);
    c.lookAt(ball.x * .5, 1.2, ball.z - 6);
    c.rotation.z = 0;
  },

  updateCam(dt) {
    const c = Gfx.camera;
    const ty = Math.max(ball.y, 0);
    c.position.x += (ball.x * .5 - c.position.x) * Math.min(1, dt * 8);
    c.position.y += ((ty + 4.8) - c.position.y) * Math.min(1, dt * 5.5);
    c.position.z += ((ball.z + 8) - c.position.z) * Math.min(1, dt * 9);
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      this.shake -= dt;
      const k = Math.max(0, this.shake) * .55;
      sx = (Math.random() - .5) * k; sy = (Math.random() - .5) * k;
      c.position.x += sx; c.position.y += sy;
    }
    c.lookAt(c.position.x - sx, ty * .45 + 1.2, ball.z - 7);
    c.rotation.z += -ball.vxs * .0075;
    const fovBase = window.innerHeight > window.innerWidth ? 66 : 58;
    const want = fovBase + (this.speed() - 12.2) * 1.15 * ball.boost;
    c.fov += (want - c.fov) * Math.min(1, dt * 2.5);
    c.updateProjectionMatrix();

    // тень идёт за мячом
    Gfx.dir.position.set(ball.x + 9, 17, ball.z + 8);
    Gfx.dir.target.position.set(ball.x, 0, ball.z - 4);
    Gfx.dir.target.updateMatrixWorld();
  },

  updateWorld(dt) {
    if (!level) return;
    const t = this.time;
    for (const c of level.coins) {
      if (c.taken || Math.abs(c.z - Gfx.camera.position.z) > 80) continue;
      c.m.rotation.y = t * 2.6 + c.z * 1.7;
      c.m.position.y = c.baseY + Math.sin(t * 2.4 + c.z) * .1;
      c.g.position.y = c.m.position.y;
    }
    for (const d of level.decor) {
      d.m.rotation.y += dt * d.spin;
      d.m.rotation.x += dt * d.spin * .5;
      d.m.position.y = d.y0 + Math.sin(t * .7 + d.bob) * .9;
    }
    for (const c of Gfx.clouds) {
      c.position.x += dt * .5;
      if (c.position.z > Gfx.camera.position.z + 30) c.position.z -= 300;
      if (c.position.x > 90) c.position.x = -90;
    }
  },

  /* ---------------------------- loop --------------------------- */
  STEP: 1 / 60,               // фиксированный шаг симуляции

  loop() {
    /* системная пауза платформы: останавливаем ВСЁ, включая рендер
       (требование Playables: onPause прекращает game loop и rendering) */
    if (this.sysPaused) { this._halted = true; return; }
    requestAnimationFrame(() => this.loop());

    /* Время берём ТОЛЬКО из performance.now() (гарантированно мс), а не из
       аргумента rAF: часть Android WebView передаёт таймстемп в иных единицах,
       из-за чего время «течёт» в 2-3 раза быстрее (баг RB_04). */
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let frame = (now - this.last) / 1000;
    this.last = now;
    if (!(frame > 0)) frame = this.STEP;
    frame = Math.min(frame, .1);            // защита от «спирали смерти» после лага/паузы

    /* ФИКСИРОВАННЫЙ ТАЙМСТЕП.
       Механика продвигается строго по STEP секунд независимо от частоты
       экрана (60/90/120/144 Гц), поэтому скорость мяча одинакова на всех
       устройствах, включая высокочастотные Android-дисплеи (баг RB_04).
       Тот же шаг использует бот-тест уровней — поведение совпадает. */
    this._acc += frame;
    let steps = 0;
    while (this._acc >= this.STEP && steps < 6) {
      this.step(this.STEP);
      this._acc -= this.STEP;
      steps++;
    }
    if (steps === 6) this._acc = 0;         // не успели — отбрасываем хвост, не ускоряемся

    // визуальные системы — раз в кадр, по реальному времени кадра (плавность)
    FX.update(frame);
    Gfx.render(frame);
    Gfx.tune(frame);
  },

  step(dt) {
    if (this.state === 'playing' && level) {
      this.updateBall(dt);
      if (this.state === 'playing') this.updateCam(dt);
    }
    this.updateWorld(this.state === 'playing' ? dt : dt * .25);
  },

  /* ----------------------------- UI ---------------------------- */
  bindUI() {
    /* На паузе (ручной или системной) и во время показа рекламы UI не должен
       реагировать: иначе из паузы можно нажать кнопки меню и запустить уровень.
       Исключение — управление самим экраном паузы. */
    const PAUSE_SAFE = { 'btn-pause': 1, 'btn-resume': 1, 'btn-quit': 1 };
    const on = (id, fn) => {
      const e = document.getElementById(id);
      if (!e) return;
      e.addEventListener('click', () => {
        // системная пауза платформы и показ рекламы глушат ВЕСЬ интерфейс,
        // включая «Продолжить» и «В меню»: выход только по onResume
        if (this.sysPaused || this.adPause) return;
        // ручная пауза: работают лишь кнопки самого экрана паузы
        if (this.state === 'paused' && !PAUSE_SAFE[id]) return;
        Audio_.nudge(); Audio_.ui(); fn();
      });
    };

    // диалог подтверждения rewarded-видео
    on('btn-offer-yes', () => {
      const fn = this._adConfirm;
      this._adConfirm = null;
      this.screen(this._adBack);
      if (fn) fn();
    });
    on('btn-offer-no', () => {
      this._adConfirm = null;
      this.screen(this._adBack);
    });

    on('btn-play', () => this.start(save.level));
    on('btn-pause', () => this.togglePause());
    on('btn-resume', () => this.togglePause());
    on('btn-quit', () => { this.bank(); this.showMenu(); });

    on('btn-shop', () => { this.renderShop(); this.screen('scr-shop'); });
    on('btn-shop-x', () => this.showMenu());


    const soundIcon = () => {
      const u = document.querySelector('#btn-sound use');
      if (u) u.setAttribute('href', save.muted ? '#i-mute' : '#i-sound');
    };
    on('btn-sound', () => {
      save.muted = !save.muted;
      Audio_.setMuted(save.muted);
      soundIcon();
      persist();
    });

    on('btn-revive', () => {
      document.getElementById('btn-revive').disabled = true;
      Platform.rewarded('revive-checkpoint', () => {
        this._revived = true;
        document.getElementById('btn-revive').style.display = 'none';
        this.respawn();
        this.screen(null);
        document.getElementById('hud').classList.remove('hidden');
        this.state = 'playing';
        Audio_.setMode(level.isBoss && level.boss && !level.boss.dead ? 'boss' : 'run');
        Platform.gameplayStart();
        if (this.sysPaused) this._showSysOverlay();
      }, ok => { if (!ok) document.getElementById('btn-revive').disabled = false; });
    });
    on('btn-retry', () => this.transition(() => this.bank(), () => this.start(save.level)));
    on('btn-over-menu', () => this.transition(() => this.bank(), () => this.showMenu()));

    on('btn-x2', () => {
      document.getElementById('btn-x2').disabled = true;
      Platform.rewarded('double-level-reward', () => {
        this.pendingScore *= 2; this.pendingCoins *= 2;
        document.getElementById('btn-x2').style.display = 'none';
        document.getElementById('win-coins').textContent = this.pendingCoins;
        document.getElementById('win-total').textContent = this.pendingScore;
        Audio_.buy();
        this.toast(t('x2done'));
      }, ok => { if (!ok) document.getElementById('btn-x2').disabled = false; });
    });
    on('btn-next', () => this.transition(() => this.advance(), () => this.start(save.level)));

    soundIcon();
    window.addEventListener('resize', () => Gfx.resize());
    // WebView иногда стартует со скрытым/нулевым вьюпортом
    window.addEventListener('orientationchange', () => setTimeout(() => Gfx.resize(), 60));
  },

  renderShop() {
    document.getElementById('shop-coins').textContent = save.coins;
    const grid = document.getElementById('skin-grid');
    grid.innerHTML = '';
    const ads = Platform.rewardedAvailable();
    SKINS.forEach(sk => {
      const own = save.skins.indexOf(sk.id) >= 0;
      const sel = save.skin === sk.id;
      const useAd = sk.ad && ads && !own;
      const card = document.createElement('button');
      card.className = 'skin' + (sel ? ' is-sel' : '') + (own ? '' : ' is-locked');
      card.type = 'button';
      const rar = document.createElement('div');
      rar.className = 'skin-rarity';
      rar.style.setProperty('--rar', RARITY[sk.rarity]);
      const orb = document.createElement('div');
      orb.className = 'skin-orb';
      orb.style.backgroundImage = 'url(' + skinThumb(sk.id) + ')';
      const nm = document.createElement('div');
      nm.className = 'skin-name';
      nm.textContent = sk.name[LANG] || sk.name.en;
      const tag = document.createElement('div');
      if (sel) { tag.className = 'skin-tag tag-sel'; tag.textContent = t('selected'); }
      else if (own) { tag.className = 'skin-tag tag-own'; tag.textContent = t('select'); }
      else if (useAd) { tag.className = 'skin-tag tag-vid'; tag.innerHTML = '<svg class="ic"><use href="#i-tv"/></svg>' + t('vidTag'); }
      else { tag.className = 'skin-tag tag-price'; tag.innerHTML = '<svg class="ic"><use href="#i-coin"/></svg>' + sk.price; }
      card.append(rar, orb, nm, tag);
      card.addEventListener('click', () => this.pickSkin(sk, card, useAd));
      grid.appendChild(card);
    });
    fixIcons(grid);            // иконки в ценниках/тегах скинов
  },

  pickSkin(sk, card, useAd) {
    Audio_.nudge();
    const own = save.skins.indexOf(sk.id) >= 0;
    if (own) {
      if (save.skin !== sk.id) { save.skin = sk.id; applySkin(sk.id); Audio_.ui(); persist(); this.renderShop(); }
      return;
    }
    const grant = () => {
      save.skins.push(sk.id);
      save.skin = sk.id;
      applySkin(sk.id);
      Audio_.buy();
      persist(true);
      this.renderShop();
    };
    if (useAd) {
      const nm = sk.name[LANG] || sk.name.en;
      this.askAd(t('vidSkinReward').replace('{n}', nm),
        () => Platform.rewarded('skin-' + sk.id, grant), 'scr-shop');
      return;
    }
    if (save.coins >= sk.price) { save.coins -= sk.price; grant(); }
    else {
      Audio_.deny();
      this.toast(t('noCoins'));
      card.classList.remove('deny'); void card.offsetWidth; card.classList.add('deny');
    }
  },

  /* --------------------------- input --------------------------- */
  bindInput() {
    const cv = document.getElementById('c');
    let px = 0;
    const blocked = () => this.sysPaused || this.adPause;

    cv.addEventListener('pointerdown', e => {
      if (blocked()) return;
      Audio_.nudge();
      if (this.state !== 'playing') return;
      this._drag = true; px = e.clientX;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!this._drag || this.state !== 'playing' || blocked()) return;
      const d = e.clientX - px;
      px = e.clientX;
      ball.targetX += d * (13 / Math.max(320, window.innerWidth));
    });
    const up = () => { this._drag = false; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', up);

    window.addEventListener('keydown', e => {
      if (blocked()) return;
      Audio_.nudge();
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.l = true; e.preventDefault(); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.r = true; e.preventDefault(); }
      if (e.code === 'Escape') {                 // НЕ вызываем preventDefault (требование Playables)
        const modal = document.querySelector('[data-modal]:not(.hidden)');
        if (modal) {
          if (modal.id === 'scr-pause') this.togglePause();
          else if (modal.id === 'scr-offer') { this._adConfirm = null; this.screen(this._adBack); }
          else this.showMenu();
        }
        else if (this.state === 'playing') this.togglePause();
      }
      if ((e.code === 'KeyP' || e.code === 'Space') && (this.state === 'playing' || this.state === 'paused')) {
        this.togglePause(); e.preventDefault();
      }
      if (e.code === 'Enter' && this.state === 'menu') { document.getElementById('btn-play').click(); }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
    });

    // это игра: без выделения текста и без браузерного контекстного меню
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('dragstart', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
  },

  /* ===================== ТЕСТ ПРОХОДИМОСТИ ===================== */
  /* Прогоняет уровень ботом без рендера. Возвращает {ok, t, z}. */
  simulate(n, maxT) {
    const prevState = this.state, prevLevel = save.level;
    this.sim = true;
    save.level = n;
    Level.build(n);
    this.resetBall(0);
    this.time = 0; this.runCoins = 0; this.streak = 0;
    ball.inv = 0;
    this.state = 'playing';

    const dt = 1 / 60, lim = (maxT || 240) / dt;
    let steps = 0, res = null;
    while (steps++ < lim) {
      Bot.think();
      this.updateBall(dt);
      if (this.state === 'win') { res = { ok: true, t: +this.time.toFixed(1), coins: this.runCoins }; break; }
      if (this.state === 'over') { res = { ok: false, t: +this.time.toFixed(1), z: +ball.z.toFixed(1), reason: 'fell' }; break; }
    }
    if (!res) res = { ok: false, t: +this.time.toFixed(1), z: +ball.z.toFixed(1), reason: 'timeout' };
    if (level && level.boss) res.bossHp = level.boss.hp;

    this.sim = false;
    this.state = prevState;
    save.level = prevLevel;
    return res;
  },

  testLevels(from, to) {
    const out = [];
    for (let n = from; n <= to; n++) {
      const r = this.simulate(n, n % 5 === 0 ? 400 : 220);
      out.push(Object.assign({ level: n, kind: n % 5 === 0 ? 'boss' : (n > 1 && n % 5 === 1 ? 'bonus' : 'normal') }, r));
    }
    Level.build(save.level);
    this.resetBall(0);
    this.snapCam();
    return out;
  }
};

const AX = new THREE.Vector3(1, 0, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const keys = { l: false, r: false };

/* ============================== BOT =============================== */
/* Простой, но честный «игрок»: смотрит вперёд, выбирает полосу,
   где есть пол и нет ловушек. Нужен для автотеста уровней. */
const Bot = {
  think() {
    const S = Game.speed();
    if (level.boss && !level.boss.dead) {
      const b = level.boss;
      if (b.state === 'charge') { ball.targetX = b.chargeX > 0 ? -2.1 : 2.1; return; }
      if (ball.z - b.z < 14) { ball.targetX = Math.max(-2.3, Math.min(2.3, b.x)); return; }
    }
    let bestX = ball.x, best = -1e9;
    for (let x = -2.4; x <= 2.41; x += .3) {
      const s = this.score(x, S);
      if (s > best) { best = s; bestX = x; }
    }
    ball.targetX = bestX;
  },

  score(cx, S) {
    let s = -Math.abs(cx - ball.x) * .35;         // не мечемся зря
    let x = ball.x;
    for (let k = 1; k <= 14; k++) {
      const dt = .07 * k;
      const z = ball.z - S * ball.boost * .07 * k;
      x += (cx - x) * .34;
      const w = 1 / k;
      const f = Level.floorAt(x, z);
      if (!f) s -= 260 * w;                        // пропасть — главный враг
      else {
        // край: держимся подальше от обрыва
        const p = f.p;
        const edge = Math.min(x - p.x0, p.x1 - x);
        if (!p.rail && edge < .75) s -= (0.75 - edge) * 26 * w;
        if (p.dyn && p.gone) s -= 200 * w;
      }
      const tt = Game.time + .07 * k;
      for (const tr of level.traps) {
        if (!tr.occ) continue;
        const zones = tr.occ(z, tt);
        if (!zones) continue;
        for (const [a, b] of zones) if (x > a && x < b) s -= 55 * w;
      }
      for (const c of level.coins) {
        if (c.taken || Math.abs(c.z - z) > .6) continue;
        if (Math.abs(c.x - x) < .55) s += 2.2 * w;
      }
    }
    return s;
  }
};

/* ============================== BOOT ============================== */
window.addEventListener('load', () => {
  // WebView может стартовать с нулевым вьюпортом — ждём валидного размера
  const go = () => Game.boot();
  if (window.innerHeight > 0 && window.innerWidth > 0) go();
  else {
    const h = () => {
      if (window.innerHeight > 0 && window.innerWidth > 0) {
        window.removeEventListener('resize', h);
        go();
      }
    };
    window.addEventListener('resize', h);
    setTimeout(go, 1200);
  }
});
