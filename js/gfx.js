'use strict';
/* =====================================================================
 *  Gfx — рендер, небо, свет, постобработка, частицы
 * ===================================================================== */

/* sRGB-авторинг → линейное пространство (three r128 не управляет цветом сам) */
function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

/* ============================ TEXTURES ============================ */
const Tex = {
  _c: {},
  make(key, w, h, draw, opts) {
    if (this._c[key]) return this._c[key];
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.encoding = (opts && opts.data) ? THREE.LinearEncoding : THREE.sRGBEncoding;
    t.anisotropy = Gfx.maxAniso;
    if (opts && opts.wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.needsUpdate = true;
    this._c[key] = t;
    return t;
  },

  glow() {
    return this.make('glow', 128, 128, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(.22, 'rgba(255,255,255,.62)');
      r.addColorStop(.55, 'rgba(255,255,255,.16)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, w, w);
    });
  },

  spark() {
    return this.make('spark', 64, 64, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(.35, 'rgba(255,255,255,.5)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, w, w);
    });
  },

  softShadow() {
    return this.make('softsh', 128, 128, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
      r.addColorStop(0, 'rgba(0,0,0,.55)');
      r.addColorStop(.5, 'rgba(0,0,0,.3)');
      r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, w, w);
    });
  },

  /* дорожное покрытие: мелкое зерно + продольные полосы (тонируется цветом материала) */
  road() {
    return this.make('road', 512, 512, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, 'rgba(0,0,0,.16)');
      grd.addColorStop(.12, 'rgba(0,0,0,0)');
      grd.addColorStop(.88, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,.16)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.globalAlpha = .05;
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = Math.random() > .5 ? '#000' : '#fff';
        const s = .5 + Math.random() * 2.2;
        g.fillRect(Math.random() * w, Math.random() * h, s, s);
      }
      g.globalAlpha = .07;
      g.fillStyle = '#000';
      for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2);
      g.globalAlpha = 1;
    }, { wrap: true });
  },

  /* жёлто-чёрный бордюр */
  rail() {
    const t = this.make('rail', 256, 64, (g, w, h) => {
      g.fillStyle = '#ffd12e'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#15161f';
      const s = 26;
      for (let x = -h; x < w + h; x += s * 2) {
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + s, 0); g.lineTo(x + s + h, h); g.lineTo(x + h, h);
        g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(0, 0, w, 5);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, h - 6, w, 6);
    }, { wrap: true });
    return t;
  },

  hazard() {
    return this.make('hazard', 256, 128, (g, w, h) => {
      g.fillStyle = '#e33b30'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f7f2ec';
      const s = 30;
      for (let x = -h; x < w + h; x += s * 2) {
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + s, 0); g.lineTo(x + s + h * .55, h); g.lineTo(x + h * .55, h);
        g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, h - 12, w, 12);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(0, 0, w, 7);
    }, { wrap: true });
  },

  brick() {
    return this.make('brick', 256, 256, (g, w, h) => {
      g.fillStyle = '#b8674a'; g.fillRect(0, 0, w, h);
      const bh = 32, bw = 64;
      for (let y = 0, row = 0; y < h; y += bh, row++) {
        const off = (row % 2) * (bw / 2);
        for (let x = -bw; x < w + bw; x += bw) {
          const sh = .82 + Math.random() * .3;
          g.fillStyle = `rgb(${Math.floor(184 * sh)},${Math.floor(103 * sh)},${Math.floor(74 * sh)})`;
          g.fillRect(x + off + 3, y + 3, bw - 6, bh - 6);
          g.fillStyle = 'rgba(255,255,255,.14)';
          g.fillRect(x + off + 3, y + 3, bw - 6, 3);
        }
      }
      g.globalAlpha = .06;
      for (let i = 0; i < 900; i++) {
        g.fillStyle = Math.random() > .5 ? '#000' : '#fff';
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      g.globalAlpha = 1;
    }, { wrap: true });
  },

  metal() {
    return this.make('metal', 256, 256, (g, w, h) => {
      g.fillStyle = '#8e97ad'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 220; i++) {
        g.strokeStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},255,.05)`;
        g.lineWidth = .5 + Math.random();
        g.beginPath();
        const y = Math.random() * h;
        g.moveTo(0, y); g.lineTo(w, y + (Math.random() - .5) * 8);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.14)';
      for (let i = 0; i < 26; i++) g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 9, 2);
    }, { wrap: true });
  },

  coin() {
    return this.make('coin', 128, 128, (g, w, h) => {
      const r = g.createLinearGradient(0, 0, w, h);
      r.addColorStop(0, '#ffe487'); r.addColorStop(.42, '#ffc53d');
      r.addColorStop(.62, '#f2a208'); r.addColorStop(1, '#ffdd6e');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.38)';
      g.beginPath(); g.arc(w / 2, h / 2, 42, 0, 6.284); g.fill();
      g.fillStyle = '#b9750a';
      g.font = 'bold 62px ' + 'Segoe UI, Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('★', w / 2, h / 2 + 3);
    });
  },

  checker() {
    return this.make('checker', 256, 64, (g, w, h) => {
      const s = 16;
      for (let y = 0; y < h; y += s)
        for (let x = 0; x < w; x += s) {
          g.fillStyle = ((x + y) / s) % 2 ? '#12131c' : '#f4f6ff';
          g.fillRect(x, y, s, s);
        }
    }, { wrap: true });
  },

  cloud() {
    return this.make('cloud', 256, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const blob = (x, y, r, a) => {
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(255,255,255,${a})`);
        rg.addColorStop(.6, `rgba(255,255,255,${a * .5})`);
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(x, y, r, 0, 6.284); g.fill();
      };
      blob(74, 78, 42, .85); blob(128, 62, 52, .9);
      blob(182, 80, 40, .8); blob(150, 88, 34, .7); blob(100, 92, 30, .65);
    });
  },

  bossSkin() {
    return this.make('bossSkin', 512, 256, (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#4a1218'); bg.addColorStop(.5, '#22070b'); bg.addColorStop(1, '#4a1218');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        g.strokeStyle = `rgba(255,${70 + Math.random() * 80},20,${.5 + Math.random() * .5})`;
        g.lineWidth = 2 + Math.random() * 4;
        g.beginPath();
        let x = Math.random() * w, y = Math.random() * h;
        g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (Math.random() - .5) * 90; y += (Math.random() - .5) * 60; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.42)';
      for (let i = 0; i < 90; i++) {
        const s = 5 + Math.random() * 16;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, s, 0, 6.284); g.fill();
      }
    });
  },

  bossFace() {
    return this.make('bossFace', 512, 512, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const eye = (cx, dir) => {
        g.fillStyle = '#fff6e2';
        g.beginPath(); g.ellipse(cx, 216, 62, 78, 0, 0, 6.284); g.fill();
        g.fillStyle = '#e01f14';
        g.beginPath(); g.arc(cx + dir * 6, 232, 30, 0, 6.284); g.fill();
        g.fillStyle = '#280203';
        g.beginPath(); g.ellipse(cx + dir * 6, 232, 9, 20, 0, 0, 6.284); g.fill();
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.beginPath(); g.arc(cx + dir * 6 - 11, 220, 7, 0, 6.284); g.fill();
      };
      eye(176, -1); eye(336, 1);
      g.strokeStyle = '#1a0304'; g.lineCap = 'round'; g.lineWidth = 34;
      g.beginPath(); g.moveTo(96, 110); g.lineTo(228, 172); g.stroke();
      g.beginPath(); g.moveTo(416, 110); g.lineTo(284, 172); g.stroke();
      g.fillStyle = '#180203';
      g.beginPath();
      g.moveTo(122, 366);
      g.quadraticCurveTo(256, 470, 390, 366);
      g.quadraticCurveTo(256, 414, 122, 366);
      g.closePath(); g.fill();
      g.fillStyle = '#fff6e2';
      for (let i = 0; i < 6; i++) {
        const x = 150 + i * 42;
        g.beginPath();
        g.moveTo(x, 378 + (i % 2) * 5); g.lineTo(x + 18, 408); g.lineTo(x + 36, 379 + (i % 2) * 4);
        g.closePath(); g.fill();
      }
    });
  }
};

/* ============================== SKY =============================== */
const SKY_VS = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const SKY_FS = `
precision highp float;
varying vec3 vDir;
uniform vec3 uTop, uHigh, uMid, uHorizon, uHaze;
uniform vec3 uSunDir, uSunCol, uAurCol;
uniform float uSunSize, uSunGlow, uStars, uAurora, uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float stars(vec3 d) {
  vec2 uv = vec2(atan(d.z, d.x) * 0.1591549, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099) * 240.0;
  vec2 c = floor(uv), f = fract(uv);
  float r = hash21(c);
  if (r < 0.94) return 0.0;
  vec2 p = vec2(hash21(c + 1.7), hash21(c + 3.1));
  float dd = length(f - p);
  float b = (r - 0.94) / 0.06;
  float tw = 0.55 + 0.45 * sin(uTime * 1.8 + r * 40.0);
  return smoothstep(0.10, 0.0, dd) * b * tw;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.20, h));
  col = mix(col, uHigh, smoothstep(0.14, 0.48, h));
  col = mix(col, uTop, smoothstep(0.42, 0.96, h));
  col = mix(uHaze, col, smoothstep(-0.14, 0.03, h));

  if (uAurora > 0.0) {
    float a = atan(d.z, d.x);
    float band = exp(-pow((h - 0.30 - 0.07 * sin(a * 2.7 + uTime * 0.25)) * 5.5, 2.0));
    float shim = 0.45 + 0.55 * sin(a * 11.0 + uTime * 0.7);
    col += uAurCol * band * shim * uAurora * smoothstep(0.02, 0.2, h);
  }
  if (uStars > 0.0) col += vec3(stars(d)) * uStars * smoothstep(0.01, 0.3, h);

  float sd = dot(d, normalize(uSunDir));
  col += uSunCol * pow(max(sd, 0.0), uSunGlow) * 0.5;
  col = mix(col, uSunCol * 2.2, smoothstep(uSunSize, uSunSize + 0.0035, sd));

  gl_FragColor = vec4(col, 1.0);
}`;

/* =========================== POST FX ============================== */
const FS_QUAD_VS = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float uThreshold, uKnee;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float s = clamp((l - uThreshold + uKnee) / (2.0 * uKnee), 0.0, 1.0);
  float w = max(s * s * uKnee, max(l - uThreshold, 0.0)) / max(l, 1e-4);
  gl_FragColor = vec4(c * w, 1.0);
}`;

const BLUR_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 uDir;
void main() {
  vec3 s = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
  s += texture2D(tDiffuse, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  s += texture2D(tDiffuse, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  s += texture2D(tDiffuse, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  s += texture2D(tDiffuse, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(s, 1.0);
}`;

const COMP_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D tScene, tBloom;
uniform float uStrength, uAberr, uVig;
void main() {
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  vec2 off = d * r2 * uAberr;
  vec3 c;
  c.r = texture2D(tScene, vUv - off).r;
  c.g = texture2D(tScene, vUv).g;
  c.b = texture2D(tScene, vUv + off).b;
  c += texture2D(tBloom, vUv).rgb * uStrength;
  c *= 1.0 - uVig * smoothstep(0.16, 0.86, r2);
  gl_FragColor = vec4(c, 1.0);
}`;

/* ============================== GFX =============================== */
const Gfx = {
  renderer: null, scene: null, camera: null,
  sky: null, skyMat: null, sun: null, water: null, clouds: [],
  hemi: null, dir: null, fog: null,
  maxAniso: 1,
  quality: { bloom: true, shadows: true, dpr: 1.5, aniso: 4 },
  _pmrem: null, _envRT: null,
  _rtScene: null, _rtA: null, _rtB: null,
  _post: null, _postCam: null, _quad: null,
  _mBright: null, _mBlur: null, _mComp: null,
  _w: 1, _h: 1, _fps: [], _tuned: false,

  init(canvas) {
    const gl2 = (() => { try { return !!canvas.getContext('webgl2'); } catch (e) { return false; } })();
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: !gl2, powerPreference: 'high-performance',
      stencil: false, depth: true, alpha: false
    });
    this.isGL2 = this.renderer.capabilities.isWebGL2;
    this.maxAniso = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this._autoQuality();
    this.renderer.setPixelRatio(this.quality.dpr);

    this.scene = new THREE.Scene();
    this.fog = new THREE.Fog(0x9fd6f2, 55, 190);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
    this.camera.position.set(0, 5, 9);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 1.0);
    this.scene.add(this.hemi);

    this.dir = new THREE.DirectionalLight(0xffffff, 2.1);
    this.dir.position.set(9, 16, 7);
    this.dir.castShadow = true;
    const S = 15;
    this.dir.shadow.camera.left = -S; this.dir.shadow.camera.right = S;
    this.dir.shadow.camera.top = S; this.dir.shadow.camera.bottom = -S;
    this.dir.shadow.camera.near = 1; this.dir.shadow.camera.far = 60;
    this.dir.shadow.mapSize.set(this.quality.shadows ? 1024 : 512, this.quality.shadows ? 1024 : 512);
    this.dir.shadow.bias = -0.0012;
    this.dir.shadow.normalBias = 0.03;
    this.scene.add(this.dir);
    this.scene.add(this.dir.target);

    /* --- sky --- */
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VS, fragmentShader: SKY_FS,
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: C(0x0d2a6e) }, uHigh: { value: C(0x2a6fd4) },
        uMid: { value: C(0x7fc4ec) }, uHorizon: { value: C(0xf7c789) },
        uHaze: { value: C(0xf2975a) },
        uSunDir: { value: new THREE.Vector3(-.4, .35, -1).normalize() },
        uSunCol: { value: C(0xfff3c4) }, uAurCol: { value: C(0x35ffc0) },
        uSunSize: { value: .9985 }, uSunGlow: { value: 180 },
        uStars: { value: 0 }, uAurora: { value: 0 }, uTime: { value: 0 }
      }
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), this.skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    /* --- water --- */
    const wTex = Tex.make('water', 512, 512, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        g.globalAlpha = .04 + Math.random() * .07;
        g.fillStyle = Math.random() > .4 ? '#ffffff' : '#4a7fd0';
        g.beginPath();
        g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 110, 2 + Math.random() * 5, 0, 0, 6.284);
        g.fill();
      }
      g.globalAlpha = 1;
    }, { wrap: true });
    wTex.repeat.set(9, 9);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshBasicMaterial({ map: wTex, color: C(0x1e6fd9) })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -11;
    this.scene.add(this.water);

    /* --- clouds --- */
    const cTex = Tex.cloud();
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cTex, transparent: true, opacity: .55, depthWrite: false, fog: false
      }));
      s.scale.set(22 + Math.random() * 20, 9 + Math.random() * 7, 1);
      s.position.set((Math.random() - .5) * 150, 10 + Math.random() * 26, -Math.random() * 260);
      s.renderOrder = -1;
      this.clouds.push(s);
      this.scene.add(s);
    }

    this._initPost();
    this.resize();
  },

  _autoQuality() {
    const dpr = window.devicePixelRatio || 1;
    const small = Math.min(window.innerWidth, window.innerHeight) < 520;
    const cores = navigator.hardwareConcurrency || 4;
    const weak = cores <= 4 || small;
    this.quality.dpr = Math.min(dpr, weak ? 1.5 : 2);
    this.quality.shadows = !weak || cores > 2;
    this.quality.bloom = this.isGL2 !== false;
  },

  /* --------------------------- post fx --------------------------- */
  _initPost() {
    this._postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._post = new THREE.Scene();
    this._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this._quad.frustumCulled = false;
    this._post.add(this._quad);

    const base = { depthTest: false, depthWrite: false, toneMapped: false };
    this._mBright = new THREE.ShaderMaterial(Object.assign({
      vertexShader: FS_QUAD_VS, fragmentShader: BRIGHT_FS,
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: .72 }, uKnee: { value: .35 } }
    }, base));
    this._mBlur = new THREE.ShaderMaterial(Object.assign({
      vertexShader: FS_QUAD_VS, fragmentShader: BLUR_FS,
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }
    }, base));
    this._mComp = new THREE.ShaderMaterial(Object.assign({
      vertexShader: FS_QUAD_VS, fragmentShader: COMP_FS,
      uniforms: {
        tScene: { value: null }, tBloom: { value: null },
        uStrength: { value: .82 }, uAberr: { value: .0055 }, uVig: { value: .34 }
      }
    }, base));
  },

  _makeRT(w, h, msaa) {
    const o = {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, encoding: THREE.LinearEncoding,
      type: this.isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType,
      depthBuffer: true, stencilBuffer: false
    };
    let rt;
    if (msaa && this.isGL2 && THREE.WebGLMultisampleRenderTarget) {
      rt = new THREE.WebGLMultisampleRenderTarget(w, h, o);
      rt.samples = 4;
    } else {
      rt = new THREE.WebGLRenderTarget(w, h, o);
    }
    rt.texture.encoding = THREE.LinearEncoding;
    return rt;
  },

  resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    if (!w || !h) return;
    this._w = w; this._h = h;
    this.renderer.setPixelRatio(this.quality.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // на сверхшироких/узких экранах держим вертикальное поле зрения адекватным
    this.camera.fov = h > w ? 66 : 58;
    this.camera.updateProjectionMatrix();

    const pw = Math.floor(w * this.quality.dpr), ph = Math.floor(h * this.quality.dpr);
    [this._rtScene, this._rtA, this._rtB].forEach(rt => rt && rt.dispose());
    this._rtScene = this._makeRT(pw, ph, true);
    const bw = Math.max(1, pw >> 1), bh = Math.max(1, ph >> 1);
    this._rtA = this._makeRT(bw, bh, false);
    this._rtB = this._makeRT(bw, bh, false);
  },

  /* Окружение для PBR-отражений: небо рендерится в 8-битный sRGB-куб.
     PMREM здесь не используем: на r128 он давал NaN в CubeUV-выборке,
     что обнуляло ВЕСЬ свет на MeshStandardMaterial (сцена уходила в чёрный). */
  refreshEnv() {
    try {
      if (!this._cubeRT) {
        this._cubeRT = new THREE.WebGLCubeRenderTarget(128, {
          format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
          generateMipmaps: true,
          minFilter: THREE.LinearMipmapLinearFilter,
          magFilter: THREE.LinearFilter,
          encoding: THREE.sRGBEncoding
        });
        this._cubeRT.texture.encoding = THREE.sRGBEncoding;
        this._cubeCam = new THREE.CubeCamera(1, 1000, this._cubeRT);
        this._skyScene = new THREE.Scene();
        this._skyScene.add(new THREE.Mesh(this.sky.geometry, this.skyMat));
      }
      const old = this.renderer.getRenderTarget();
      this._cubeCam.update(this.renderer, this._skyScene);
      this.renderer.setRenderTarget(old);
      this.scene.environment = this._cubeRT.texture;
    } catch (e) {
      this.scene.environment = null;   // без IBL игра всё равно выглядит нормально
    }
  },

  /* ---------------------------- render --------------------------- */
  render(dt) {
    this.skyMat.uniforms.uTime.value += dt;
    this.sky.position.copy(this.camera.position);
    this.water.position.x = this.camera.position.x;
    this.water.position.z = this.camera.position.z - 160;
    if (this.water.material.map) this.water.material.map.offset.y += dt * .012;

    const r = this.renderer;
    if (!this.quality.bloom || !this._rtScene) {
      r.setRenderTarget(null);
      r.render(this.scene, this.camera);
      return;
    }
    r.setRenderTarget(this._rtScene);
    r.clear();
    r.render(this.scene, this.camera);

    const tex = this._rtScene.texture;
    this._quad.material = this._mBright;
    this._mBright.uniforms.tDiffuse.value = tex;
    r.setRenderTarget(this._rtA);
    r.clear();
    r.render(this._post, this._postCam);

    const bw = this._rtA.width, bh = this._rtA.height;
    this._quad.material = this._mBlur;
    for (let i = 0; i < 2; i++) {
      this._mBlur.uniforms.tDiffuse.value = this._rtA.texture;
      this._mBlur.uniforms.uDir.value.set(1 / bw, 0);
      r.setRenderTarget(this._rtB); r.clear(); r.render(this._post, this._postCam);
      this._mBlur.uniforms.tDiffuse.value = this._rtB.texture;
      this._mBlur.uniforms.uDir.value.set(0, 1 / bh);
      r.setRenderTarget(this._rtA); r.clear(); r.render(this._post, this._postCam);
    }

    this._quad.material = this._mComp;
    this._mComp.uniforms.tScene.value = tex;
    this._mComp.uniforms.tBloom.value = this._rtA.texture;
    r.setRenderTarget(null);
    r.render(this._post, this._postCam);
  },

  /* если устройство не тянет — тихо снижаем качество один раз */
  tune(dt) {
    if (this._tuned || !this.quality.bloom) return;
    this._fps.push(1 / Math.max(dt, .001));
    if (this._fps.length < 150) return;
    const avg = this._fps.reduce((a, b) => a + b, 0) / this._fps.length;
    this._fps.length = 0;
    if (avg < 42) {
      this.quality.bloom = false;
      this.quality.dpr = Math.min(this.quality.dpr, 1.25);
      this.dir.shadow.mapSize.set(512, 512);
      if (this.dir.shadow.map) { this.dir.shadow.map.dispose(); this.dir.shadow.map = null; }
      this.resize();
    }
    this._tuned = true;
  }
};

/* =========================== PARTICLES ============================ */
const FX = {
  trail: [], sparks: [], debris: [], _t: 0, _s: 0, _d: 0, _acc: 0,
  color: new THREE.Color(0x4dffc3),

  init(scene) {
    const gtex = Tex.glow(), stex = Tex.spark();
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: gtex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, color: this.color.clone()
      }));
      s.visible = false; scene.add(s);
      this.trail.push({ s, life: 0, max: .42 });
    }
    for (let i = 0; i < 46; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: stex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, color: new THREE.Color(0xffffff)
      }));
      s.visible = false; scene.add(s);
      this.sparks.push({ s, life: 0, max: .5, vx: 0, vy: 0, vz: 0, g: 9 });
    }
    const dg = new THREE.BoxGeometry(.3, .22, .2);
    const dm = new THREE.MeshStandardMaterial({ map: Tex.brick(), roughness: .9, metalness: 0 });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(dg, dm);
      m.castShadow = true; m.visible = false; scene.add(m);
      this.debris.push({ m, life: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0 });
    }
  },

  setTrailColor(hex) {
    this.color.set(hex);
    const lin = new THREE.Color(hex).convertSRGBToLinear();
    this.trail.forEach(t => t.s.material.color.copy(lin));
  },

  emitTrail(x, y, z, scale) {
    const t = this.trail[this._t++ % this.trail.length];
    t.s.visible = true;
    t.s.position.set(x, y, z + .28);
    t.life = t.max;
    t.k = scale || 1;
  },

  burst(x, y, z, hex, n, power, gravity) {
    const lin = new THREE.Color(hex).convertSRGBToLinear();
    for (let i = 0; i < (n || 8); i++) {
      const p = this.sparks[this._s++ % this.sparks.length];
      p.s.visible = true;
      p.s.material.color.copy(lin);
      p.s.position.set(x, y, z);
      const a = Math.random() * 6.284, e = Math.random();
      const sp = (power || 3) * (.4 + Math.random() * .8);
      p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp;
      p.vy = (1 + e * 2.4) * (power || 3) * .55;
      p.g = gravity == null ? 11 : gravity;
      p.life = p.max = .32 + Math.random() * .35;
      p.k = .5 + Math.random() * .7;
    }
  },

  rubble(x0, x1, z, y) {
    for (let i = 0; i < 12; i++) {
      const d = this.debris[this._d++ % this.debris.length];
      d.m.visible = true;
      d.m.position.set(x0 + Math.random() * (x1 - x0), (y || 0) + .25 + Math.random() * 1.3, z);
      d.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      d.m.scale.setScalar(.55 + Math.random() * .95);
      d.vx = (Math.random() - .5) * 8;
      d.vy = 2.5 + Math.random() * 5;
      d.vz = -(1.5 + Math.random() * 7);
      d.rx = (Math.random() - .5) * 14;
      d.rz = (Math.random() - .5) * 14;
      d.life = 1.1;
    }
  },

  update(dt) {
    for (const t of this.trail) {
      if (t.life <= 0) continue;
      t.life -= dt;
      const k = Math.max(0, t.life / t.max);
      t.s.material.opacity = k * .5;
      const sc = (.35 + k * .85) * (t.k || 1);
      t.s.scale.set(sc, sc, 1);
      if (t.life <= 0) t.s.visible = false;
    }
    for (const p of this.sparks) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= p.g * dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      const k = Math.max(0, p.life / p.max);
      p.s.material.opacity = k;
      const sc = (.25 + k * .5) * (p.k || 1);
      p.s.scale.set(sc, sc, 1);
      if (p.life <= 0) p.s.visible = false;
    }
    for (const d of this.debris) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.vy -= 24 * dt;
      d.m.position.x += d.vx * dt;
      d.m.position.y += d.vy * dt;
      d.m.position.z += d.vz * dt;
      d.m.rotation.x += d.rx * dt;
      d.m.rotation.z += d.rz * dt;
      if (d.life <= 0 || d.m.position.y < -4) { d.life = 0; d.m.visible = false; }
    }
  },

  reset() {
    this.trail.forEach(t => { t.life = 0; t.s.visible = false; });
    this.sparks.forEach(p => { p.life = 0; p.s.visible = false; });
    this.debris.forEach(d => { d.life = 0; d.m.visible = false; });
  }
};
