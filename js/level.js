'use strict';
/* =====================================================================
 *  Level — биомы, ловушки, чанки трассы, генератор, босс-арена
 *  Правило дизайна: у КАЖДОЙ ловушки в любой момент есть безопасная
 *  полоса. Уровень обязан проходиться без «слепой удачи».
 * ===================================================================== */

const HALF = 3;          // полуширина трассы
const BALL_R = 0.55;
const GRAV = 30;
const LANE = [-1.7, 0, 1.7];

/* ============================= BIOMES ============================= */
const BIOMES = [
  { id: 'dawn', road: 0xe8a24d, rail: 0xffd12e, deco: 0xc07a2e, water: 0x1e6fd9, fog: 0x9fd6f2,
    hemi: [0xcfe8ff, 0x8a5a2e, 1.05], dir: [0xfff2d0, 2.2], sun: [-.35, .30, -1], sunCol: 0xfff3c4,
    sky: { top: 0x0d2a6e, high: 0x2a6fd4, mid: 0x7fc4ec, hor: 0xf7c789, haze: 0xf2975a, stars: 0, aur: 0, sunSize: .9986, sunGlow: 170 } },

  { id: 'sunset', road: 0xf07f8f, rail: 0xffd12e, deco: 0x8e3f74, water: 0x5a4bc4, fog: 0xe89a86,
    hemi: [0xffd0c0, 0x6a3a6a, .95], dir: [0xffb070, 1.9], sun: [.30, .12, -1], sunCol: 0xffb45e,
    sky: { top: 0x241150, high: 0x6e2d8f, mid: 0xc74d8a, hor: 0xf2814f, haze: 0xffb36b, stars: .25, aur: 0, sunSize: .9975, sunGlow: 90 } },

  { id: 'neon', road: 0x7a4bd4, rail: 0x35e8ff, deco: 0xff3df2, water: 0x120a3a, fog: 0x1b1550,
    hemi: [0x8fa8ff, 0x2a1060, .8], dir: [0xc9a8ff, 1.35], sun: [.45, .40, -1], sunCol: 0xd8e2ff,
    sky: { top: 0x03040f, high: 0x0d0a38, mid: 0x231764, hor: 0x5a2a8e, haze: 0x2a1050, stars: 1, aur: 0, sunSize: .9992, sunGlow: 380 } },

  { id: 'ice', road: 0x8fd6e8, rail: 0xffffff, deco: 0x4a9ec4, water: 0x0e2a50, fog: 0x2a4a78,
    hemi: [0xa8d8ff, 0x2a4a70, .9], dir: [0xdcefff, 1.5], sun: [-.5, .35, -1], sunCol: 0xcfe4ff,
    sky: { top: 0x030818, high: 0x0a1838, mid: 0x16345e, hor: 0x2a5a7e, haze: 0x14283f, stars: .9, aur: 1, sunSize: .9990, sunGlow: 300 } },

  { id: 'volcano', road: 0x5e4038, rail: 0xff8c1a, deco: 0x8e2a12, water: 0xd2380a, fog: 0x6a2412,
    hemi: [0xffb08a, 0x6a1a08, .95], dir: [0xffc49a, 1.7], sun: [.2, .18, -1], sunCol: 0xff9a3a,
    sky: { top: 0x1a0604, high: 0x3e0d06, mid: 0x76220c, hor: 0xc4470e, haze: 0x5e1a08, stars: .12, aur: 0, sunSize: .9980, sunGlow: 110 } },

  { id: 'cosmic', road: 0x4a4a8e, rail: 0xa77bff, deco: 0x35ffc0, water: 0x08061c, fog: 0x120e38,
    hemi: [0xa8b0ff, 0x2a1a5e, .85], dir: [0xe0d0ff, 1.4], sun: [-.25, .5, -1], sunCol: 0xffe8ff,
    sky: { top: 0x02020a, high: 0x0a0628, mid: 0x1e1050, hor: 0x4a2080, haze: 0x1a0e3e, stars: 1, aur: .55, sunSize: .9988, sunGlow: 260 } }
];

function biomeFor(n) {
  if (n % 5 === 0) return BIOMES[4];                 // босс — всегда вулкан
  if (n > 1 && n % 5 === 1) return BIOMES[5];        // бонус — космос
  return BIOMES[(Math.floor((n - 1) / 1)) % 4];      // остальные циклом
}

function applyBiome(b) {
  const u = Gfx.skyMat.uniforms;
  u.uTop.value.copy(C(b.sky.top)); u.uHigh.value.copy(C(b.sky.high));
  u.uMid.value.copy(C(b.sky.mid)); u.uHorizon.value.copy(C(b.sky.hor));
  u.uHaze.value.copy(C(b.sky.haze));
  u.uSunCol.value.copy(C(b.sunCol));
  u.uSunDir.value.set(b.sun[0], b.sun[1], b.sun[2]).normalize();
  u.uSunSize.value = b.sky.sunSize;
  u.uSunGlow.value = b.sky.sunGlow;
  u.uStars.value = b.sky.stars;
  u.uAurora.value = b.sky.aur;
  Gfx.fog.color.copy(C(b.fog));
  Gfx.water.material.color.copy(C(b.water));
  Gfx.hemi.color.copy(C(b.hemi[0]));
  Gfx.hemi.groundColor.copy(C(b.hemi[1]));
  Gfx.hemi.intensity = b.hemi[2];
  Gfx.dir.color.copy(C(b.dir[0]));
  Gfx.dir.intensity = b.dir[1];
  Gfx.dir.position.set(b.sun[0] * -14, 16, b.sun[2] * -14 + 6);
  Gfx.clouds.forEach(c => { c.material.opacity = b.sky.stars > .8 ? .12 : .5; });
  Gfx.refreshEnv();
}

/* ============================ RNG ================================= */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let z = Math.imul(a ^ (a >>> 15), 1 | a);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================ LEVEL =============================== */
let level = null;

const Level = {
  /* ------------------------- primitives ------------------------- */
  road(L, zMax, zMin, x0, x1, y0, y1, rails) {
    const p = { x0, x1, zMax, zMin, y0: y0 || 0, y1: y1 || 0, rail: !!rails };
    L.pieces.push(p);
    for (let b = Math.floor(-zMax / 8); b <= Math.floor(-zMin / 8); b++) {
      (L.buckets[b] || (L.buckets[b] = [])).push(p);
    }
    const len = zMax - zMin, w = x1 - x0, dy = (y1 || 0) - (y0 || 0);
    const geo = new THREE.BoxGeometry(w, .8, Math.sqrt(len * len + dy * dy));
    const m = new THREE.Mesh(geo, L.mats.road);
    m.position.set((x0 + x1) / 2, ((y0 || 0) + (y1 || 0)) / 2 - .4, (zMax + zMin) / 2);
    m.rotation.x = Math.atan2(dy, len);
    m.receiveShadow = true;
    m.castShadow = false;
    L.group.add(m);
    if (rails) { this.rail(L, x0 - .12, zMax, zMin, y0, y1); this.rail(L, x1 + .12, zMax, zMin, y0, y1); }
    return p;
  },

  rail(L, x, zMax, zMin, y0, y1) {
    const len = zMax - zMin, dy = (y1 || 0) - (y0 || 0);
    const geo = new THREE.CylinderGeometry(.24, .24, Math.sqrt(len * len + dy * dy), 8);
    const m = new THREE.Mesh(geo, L.mats.rail);
    m.rotation.x = Math.PI / 2 + Math.atan2(dy, len);
    m.position.set(x, ((y0 || 0) + (y1 || 0)) / 2 + .2, (zMax + zMin) / 2);
    m.castShadow = true;
    L.group.add(m);
  },

  coin(L, x, y, z) {
    const m = new THREE.Mesh(L.geos.coin, L.mats.coin);
    m.position.set(x, y, z);
    m.castShadow = true;
    L.group.add(m);
    const g = new THREE.Sprite(L.mats.coinGlow);
    g.position.set(x, y, z);
    g.scale.set(1.7, 1.7, 1);
    L.group.add(g);
    L.coins.push({ x, y, z, baseY: y, taken: false, m, g });
  },

  coins(L, x, z0, n, step, y) {
    for (let i = 0; i < n; i++) this.coin(L, x, (y || 0) + .62, z0 - i * step);
  },

  arc(L, x, z0, n, step, h) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.coin(L, x, .62 + Math.sin(t * Math.PI) * (h || 1.6), z0 - i * step);
    }
  },

  /* --------------------------- traps ---------------------------- */
  /* каждая ловушка: mesh + update(dt,time) + occ(z,t) → занятые полосы */

  slider(L, z, speed, range) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1), L.mats.hazard);
    m.position.set(0, .5, z);
    m.castShadow = true;
    L.group.add(m);
    const ph = Math.random() * 6.28;
    L.traps.push({
      type: 'slider', z, m, hw: 1.1, hd: .5,
      xAt: t => Math.sin(t * speed + ph) * range,
      update(dt, t) { m.position.x = this.xAt(t); },
      hit(b) {
        const cx = m.position.x;
        if (Math.abs(b.z - z) < this.hd + BALL_R * .85 && Math.abs(b.x - cx) < this.hw + BALL_R * .85 && b.y - BALL_R < 1)
          return { vx: b.x < cx ? -5 : 5, vz: 8 };
        return null;
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.6) return null;
        const cx = this.xAt(t);
        return [[cx - this.hw - BALL_R, cx + this.hw + BALL_R]];
      }
    });
  },

  spinner(L, z, w) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, 2.6, 10), L.mats.metal);
    pole.position.y = 1.3; pole.castShadow = true; g.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), L.mats.gold);
    cap.position.y = 2.7; cap.castShadow = true; g.add(cap);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, .46, .46), L.mats.hazard);
    bar.position.y = .55; bar.castShadow = true; g.add(bar);
    g.position.set(0, 0, z);
    L.group.add(g);
    const HL = 2.6;
    L.traps.push({
      type: 'spinner', z, g, HL,
      update(dt, t) { g.rotation.y = t * w; },
      hit(b) {
        if (Math.abs(b.z - z) > HL + 1 || b.y - BALL_R > 1.05) return null;
        const a = g.rotation.y, cs = Math.cos(a), sn = Math.sin(a);
        const dx = b.x, dz = b.z - z;
        const s = dx * cs - dz * sn, q = dx * sn + dz * cs;
        if (Math.abs(s) < HL + BALL_R * .6 && Math.abs(q) < .23 + BALL_R * .8)
          return { vx: (s >= 0 ? 5 : -5), vz: 7 };
        return null;
      },
      occ(zz, t) {
        const dz = zz - z;
        if (Math.abs(dz) > HL) return null;
        const a = t * w, cs = Math.cos(a), sn = Math.sin(a);
        if (Math.abs(sn) < .001) return Math.abs(dz) < .5 ? [[-HL, HL]] : null;
        // бар: точки (s, 0) в локальных коорд.; ищем x, где q≈0 при данном dz
        const xr = [];
        for (let s = -HL; s <= HL; s += .3) {
          const wx = s * cs + 0 * sn, wz = -s * sn + 0 * cs;
          if (Math.abs(wz - dz) < .55) xr.push([wx - .5, wx + .5]);
        }
        return xr.length ? xr : null;
      }
    });
  },

  piston(L, z, lane, period, offset) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 1.7), L.mats.hazard);
    head.castShadow = true; g.add(head);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 4.4, 8), L.mats.metal);
    rod.position.y = 2.7; g.add(rod);
    g.position.set(lane, 4, z);
    L.group.add(g);
    const yAt = t => {
      const p = ((t + offset) % period) / period;
      return p < .16 ? 4 - (p / .16) * 3.35 : (p < .34 ? .65 : .65 + Math.min(1, (p - .34) / .5) * 3.35);
    };
    L.traps.push({
      type: 'piston', z, lane, g,
      update(dt, t) { g.position.y = yAt(t); },
      hit(b) {
        if (Math.abs(b.z - z) > .85 + BALL_R || Math.abs(b.x - lane) > .85 + BALL_R) return null;
        if (g.position.y > 1.9) return null;
        return { vx: b.x < lane ? -6 : 6, vz: 9 };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.5) return null;
        return yAt(t) < 2.1 ? [[lane - .85 - BALL_R, lane + .85 + BALL_R]] : null;
      }
    });
  },

  laser(L, z, lane, period, offset) {
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const em = new THREE.Mesh(new THREE.BoxGeometry(.4, 1.5, .4), L.mats.metal);
      em.position.set(lane + s * .95, .75, 0);
      em.castShadow = true; g.add(em);
    });
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, .16, .16),
      new THREE.MeshBasicMaterial({ color: C(0xff4d6a), transparent: true, opacity: .9, fog: false })
    );
    beam.position.set(lane, .75, 0);
    g.add(beam);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Tex.glow(), color: C(0xff2a4a), transparent: true, opacity: .8,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    halo.scale.set(2.4, .9, 1);
    halo.position.set(lane, .75, 0);
    g.add(halo);
    g.position.set(0, 0, z);
    L.group.add(g);
    const onAt = t => (((t + offset) % period) / period) < .52;
    L.traps.push({
      type: 'laser', z, lane, g,
      update(dt, t) {
        const on = onAt(t);
        beam.visible = halo.visible = on;
        if (on) {
          const k = .75 + Math.sin(t * 40) * .25;
          halo.material.opacity = k;
          beam.scale.y = beam.scale.z = .8 + k * .4;
        }
      },
      hit(b) {
        if (!onAt(Game.time) || Math.abs(b.z - z) > .3 + BALL_R * .7) return null;
        if (Math.abs(b.x - lane) > .75 + BALL_R * .7 || b.y - BALL_R > 1.2) return null;
        return { vx: 0, vz: 8, laser: true };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1) return null;
        return onAt(t) ? [[lane - .75 - BALL_R, lane + .75 + BALL_R]] : null;
      }
    });
  },

  saw(L, z, lane, span, speed) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .12, 22), L.mats.blade);
    disc.rotation.z = Math.PI / 2;
    disc.castShadow = true;
    g.add(disc);
    const teeth = new THREE.Mesh(new THREE.TorusGeometry(.95, .1, 6, 20), L.mats.metal);
    teeth.rotation.y = Math.PI / 2;
    g.add(teeth);
    g.position.set(lane, .35, z);
    L.group.add(g);
    const ph = Math.random() * 6.28;
    const xAt = t => lane + Math.sin(t * speed + ph) * span;
    L.traps.push({
      type: 'saw', z, g,
      update(dt, t) { g.position.x = xAt(t); disc.rotation.y += dt * 26; },
      hit(b) {
        const cx = g.position.x;
        if (Math.abs(b.z - z) > .5 + BALL_R || Math.abs(b.x - cx) > .9 + BALL_R * .7 || b.y - BALL_R > 1) return null;
        return { vx: b.x < cx ? -7 : 7, vz: 7, spark: true };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.4) return null;
        const cx = xAt(t);
        return [[cx - .9 - BALL_R, cx + .9 + BALL_R]];
      }
    });
  },

  pendulum(L, z, amp, speed, phase) {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 4.2, 6), L.mats.metal);
    bar.position.y = -2.1; g.add(bar);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.72, 18, 14), L.mats.hazard);
    ball.position.y = -4.2; ball.castShadow = true; g.add(ball);
    const spikes = new THREE.Mesh(new THREE.IcosahedronGeometry(.82, 0), L.mats.metal);
    spikes.position.y = -4.2; g.add(spikes);
    g.position.set(0, 5.2, z);
    L.group.add(g);
    const aAt = t => Math.sin(t * speed + phase) * amp;
    L.traps.push({
      type: 'pendulum', z, g,
      update(dt, t) { g.rotation.z = aAt(t); },
      hit(b) {
        const a = g.rotation.z;
        const bx = Math.sin(a) * 4.2, by = 5.2 - Math.cos(a) * 4.2;
        if (Math.abs(b.z - z) > .8 + BALL_R) return null;
        if (Math.abs(b.x - bx) > .72 + BALL_R || Math.abs(b.y - by) > 1.5) return null;
        return { vx: b.x < bx ? -8 : 8, vz: 9 };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.6) return null;
        const bx = Math.sin(aAt(t)) * 4.2;
        return [[bx - .72 - BALL_R, bx + .72 + BALL_R]];
      }
    });
  },

  spikes(L, z, lane, period, offset) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, .16, .9), L.mats.metal);
    g.add(base);
    const sg = new THREE.ConeGeometry(.16, .7, 5);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(sg, L.mats.blade);
      s.position.set(-.65 + i * .33, .42, 0);
      s.castShadow = true;
      g.add(s);
    }
    g.position.set(lane, .05, z);
    L.group.add(g);
    const upAt = t => (((t + offset) % period) / period) < .45;
    L.traps.push({
      type: 'spikes', z, lane, g,
      update(dt, t) {
        const p = ((t + offset) % period) / period;
        const up = p < .45 ? Math.min(1, p / .1) : Math.max(0, 1 - (p - .45) / .1);
        g.position.y = -.7 + up * .75;
      },
      hit(b) {
        if (!upAt(Game.time)) return null;
        if (Math.abs(b.z - z) > .45 + BALL_R || Math.abs(b.x - lane) > .85 + BALL_R * .8) return null;
        if (b.y - BALL_R > .85) return null;
        return { vx: 0, vz: 7 };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.2) return null;
        return upAt(t) ? [[lane - .85 - BALL_R, lane + .85 + BALL_R]] : null;
      }
    });
  },

  roller(L, z, speed, range) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 2.4, 16), L.mats.hazard);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, .75, z);
    m.castShadow = true;
    L.group.add(m);
    const ph = Math.random() * 6.28;
    const xAt = t => Math.sin(t * speed + ph) * range;
    L.traps.push({
      type: 'roller', z, m,
      update(dt, t) {
        const x = xAt(t);
        m.rotation.x += (x - m.position.x) / .75;
        m.position.x = x;
      },
      hit(b) {
        const cx = m.position.x;
        if (Math.abs(b.z - z) > .75 + BALL_R || Math.abs(b.x - cx) > 1.2 + BALL_R * .7) return null;
        return { vx: b.x < cx ? -6 : 6, vz: 8 };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.7) return null;
        const cx = xAt(t);
        return [[cx - 1.2 - BALL_R, cx + 1.2 + BALL_R]];
      }
    });
  },

  bumper(L, x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.62, .72, .8, 18), L.mats.bumper);
    body.castShadow = true; g.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .14, 18), L.mats.gold);
    top.position.y = .46; g.add(top);
    g.position.set(x, .4, z);
    L.group.add(g);
    L.traps.push({
      type: 'bumper', z, g, x,
      update(dt, t) { g.scale.setScalar(1 + Math.sin(t * 5 + x) * .04); },
      hit(b) {
        const dx = b.x - x, dz = b.z - z;
        if (dx * dx + dz * dz > (.72 + BALL_R) * (.72 + BALL_R) || b.y - BALL_R > .9) return null;
        const d = Math.max(.001, Math.hypot(dx, dz));
        return { vx: (dx / d) * 9, vz: Math.max(2, (dz / d) * 9), bumper: true };
      },
      occ(zz, t) {
        if (Math.abs(zz - z) > 1.3) return null;
        return [[x - .72 - BALL_R, x + .72 + BALL_R]];
      }
    });
  },

  fan(L, z, len, dir, power) {
    const g = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .5, 16), L.mats.metal);
    housing.rotation.z = Math.PI / 2;
    housing.position.set(dir > 0 ? -HALF - .7 : HALF + .7, 1, z - len / 2);
    housing.castShadow = true;
    g.add(housing);
    const blades = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.5, .3), L.mats.blade);
    blades.position.copy(housing.position);
    g.add(blades);
    const blades2 = blades.clone();
    blades2.rotation.x = Math.PI / 2;
    g.add(blades2);
    // визуальные линии ветра
    const wind = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Tex.glow(), color: C(0xbfe8ff), transparent: true, opacity: .3,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      s.scale.set(2.2, .2, 1);
      s.position.set(0, .7 + Math.random() * 1.2, z - Math.random() * len);
      g.add(s);
      wind.push(s);
    }
    L.group.add(g);
    L.traps.push({
      type: 'fan', z, zMin: z - len, dir, power, g,
      update(dt, t) {
        blades.rotation.x += dt * 22; blades2.rotation.x += dt * 22;
        wind.forEach((s, i) => {
          s.position.x += dir * dt * 7;
          if (dir > 0 && s.position.x > HALF) s.position.x = -HALF;
          if (dir < 0 && s.position.x < -HALF) s.position.x = HALF;
          s.material.opacity = .18 + Math.sin(t * 4 + i) * .1;
        });
      },
      hit() { return null; },      // ветер не бьёт, а сносит (см. Game.updateBall)
      push(b, dt) {
        if (b.z < this.z && b.z > this.zMin) { b.x += dir * power * dt; b.targetX += dir * power * dt; }
      },
      occ() { return null; }
    });
  },

  conveyor(L, z, len, dir) {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, .12, len), L.mats.belt);
    belt.position.set(0, .06, z - len / 2);
    belt.receiveShadow = true;
    L.group.add(belt);
    L.traps.push({
      type: 'conveyor', z, zMin: z - len, dir, belt,
      update(dt, t) { L.mats.belt.map.offset.x = (dir > 0 ? -t : t) * .5; },
      hit() { return null; },
      push(b, dt) {
        if (b.z < this.z && b.z > this.zMin && b.grounded) { b.x += dir * 2.6 * dt; b.targetX += dir * 2.6 * dt; }
      },
      occ() { return null; }
    });
  },

  breakwall(L, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 1.6, .5), L.mats.brick);
    m.position.set(0, .8, z);
    m.castShadow = true; m.receiveShadow = true;
    L.group.add(m);
    L.traps.push({
      type: 'breakwall', z, m, broken: false,
      update() {},
      hit(b) {
        if (this.broken || Math.abs(b.z - z) > .25 + BALL_R * .8 || b.y - BALL_R > 1.7) return null;
        this.broken = true;
        m.visible = false;
        return { crash: true, x: b.x };
      },
      occ() { return null; }     // пробивается насквозь — не опасна
    });
  },

  /* ---------------------- dynamic floor ------------------------- */
  collapse(L, x0, x1, zMax, zMin) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .5, zMax - zMin), L.mats.crack);
    m.position.set((x0 + x1) / 2, -.25, (zMax + zMin) / 2);
    m.receiveShadow = true;
    L.group.add(m);
    const p = {
      x0, x1, zMax, zMin, y0: 0, y1: 0, rail: false, dyn: true, gone: false,
      m, state: 0, t: 0,
      touch() { if (this.state === 0) { this.state = 1; this.t = .45; } },
      update(dt) {
        if (this.state === 1) {
          this.t -= dt;
          m.position.x = (x0 + x1) / 2 + Math.sin(this.t * 60) * .045;
          if (this.t <= 0) { this.state = 2; this.t = 0; this.gone = true; }
        } else if (this.state === 2) {
          this.t += dt;
          m.position.y = -.25 - this.t * this.t * 14;
          m.rotation.x += dt * 1.2;
          if (m.position.y < -22) m.visible = false;
        }
      }
    };
    L.dyn.push(p);
    return p;
  },

  bridge(L, zMax, zMin, w, speed, phase) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, .5, zMax - zMin), L.mats.plate);
    m.position.set(0, -.25, (zMax + zMin) / 2);
    m.receiveShadow = true; m.castShadow = true;
    L.group.add(m);
    const lim = HALF - w / 2;
    const p = {
      x0: -w / 2, x1: w / 2, zMax, zMin, y0: 0, y1: 0, rail: false, dyn: true, gone: false,
      m, w,
      xAt: t => Math.sin(t * speed + phase) * lim,
      update(dt, t) {
        const cx = this.xAt(t);
        m.position.x = cx;
        this.x0 = cx - w / 2; this.x1 = cx + w / 2;
      }
    };
    L.dyn.push(p);
    return p;
  },

  /* ----------------------- decorations -------------------------- */
  gate(L, z, kind) {
    const g = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(.18, .22, 4.6, 10);
    [-HALF - .35, HALF + .35].forEach(x => {
      const p = new THREE.Mesh(poleGeo, L.mats.metal);
      p.position.set(x, 2.3, 0); p.castShadow = true; g.add(p);
      const c = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), L.mats.gold);
      c.position.set(x, 4.7, 0); g.add(c);
    });
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2 + 1.4, .9),
      new THREE.MeshBasicMaterial({ map: Tex.checker(), side: THREE.DoubleSide })
    );
    banner.position.set(0, 4.1, 0);
    g.add(banner);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2 + .7, 4.2),
      new THREE.MeshBasicMaterial({
        map: Tex.glow(), color: C(0x4dffc3), transparent: true, opacity: .3,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
      })
    );
    glow.position.set(0, 2.1, 0);
    g.add(glow);
    g.position.z = z;
    L.group.add(g);
    L.gate = g;
    return g;
  },

  checkpointArch(L, z) {
    const g = new THREE.Group();
    [-HALF - .3, HALF + .3].forEach(x => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 3, 8), L.mats.metal);
      p.position.set(x, 1.5, 0); g.add(p);
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + .9, .18, .18), L.mats.gold);
    bar.position.y = 3; g.add(bar);
    g.position.z = z;
    L.group.add(g);
  },

  decor(L, rnd, z0, z1, biome) {
    const n = Math.min(14, Math.floor((z0 - z1) / 30));
    for (let i = 0; i < n; i++) {
      const side = rnd() > .5 ? 1 : -1;
      const k = rnd();
      let m;
      if (k < .3) m = new THREE.Mesh(new THREE.TorusGeometry(2 + rnd() * 1.8, .38, 8, 20), L.mats.deco);
      else if (k < .55) m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rnd() * 1.4, 0), L.mats.deco2);
      else if (k < .8) m = new THREE.Mesh(new THREE.OctahedronGeometry(1.4 + rnd() * 1.2, 0), L.mats.deco);
      else m = new THREE.Mesh(new THREE.ConeGeometry(1.3 + rnd(), 2.6 + rnd() * 2.4, 6), L.mats.deco2);
      m.position.set(side * (12 + rnd() * 26), 1 + rnd() * 12, z0 - (i + .5) * 30 - rnd() * 14);
      m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      L.group.add(m);
      L.decor.push({ m, spin: (rnd() - .5) * .5, bob: rnd() * 6.28, y0: m.position.y });
    }
  },

  /* =========================== CHUNKS ========================== */
  /* каждый: (L, z, rnd, n) → новый z. Гарантируют проходимость. */
  CH: {
    cruise(L, z, rnd, n) {
      const len = 13 + Math.floor(rnd() * 4);
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.coins(L, LANE[Math.floor(rnd() * 3)], z - 3, 5, 1.9, 0);
      return z - len;
    },

    gap(L, z, rnd, n) {
      const g = Math.min(1.5 + n * .04, 2.1);
      Level.road(L, z, z - 7, -HALF, HALF, 0, 0, true);
      Level.road(L, z - 7 - g, z - 15 - g, -HALF, HALF, 0, 0, true);
      Level.coins(L, 0, z - 2, 2, 1.6, 0);
      return z - 15 - g;
    },

    gapRun(L, z, rnd, n) {
      const g = Math.min(1.4 + n * .03, 1.9);
      let c = z;
      for (let i = 0; i < 3; i++) {
        Level.road(L, c, c - 5.5, -HALF, HALF, 0, 0, true);
        Level.coin(L, 0, .62, c - 2.7);
        c -= 5.5 + g;
      }
      Level.road(L, c, c - 6, -HALF, HALF, 0, 0, true);
      return c - 6;
    },

    narrow(L, z, rnd, n) {
      const hw = Math.max(.95, 1.5 - n * .02);
      Level.road(L, z, z - 3, -HALF, HALF, 0, 0, true);
      Level.road(L, z - 3, z - 15, -hw, hw, 0, 0, false);
      Level.coins(L, 0, z - 5, 5, 2.1, 0);
      Level.road(L, z - 15, z - 18, -HALF, HALF, 0, 0, true);
      return z - 18;
    },

    zigzag(L, z, rnd, n) {
      const hw = 1.25;
      Level.road(L, z, z - 3, -HALF, HALF, 0, 0, true);
      let c = z - 3;
      const dirs = rnd() > .5 ? [-1, 1, -1] : [1, -1, 1];
      dirs.forEach(d => {
        const cx = d * 1.5;
        Level.road(L, c, c - 6, cx - hw, cx + hw, 0, 0, false);
        Level.coins(L, cx, c - 1.5, 3, 1.6, 0);
        c -= 6;
      });
      Level.road(L, c, c - 3, -HALF, HALF, 0, 0, true);
      return c - 3;
    },

    holes(L, z, rnd, n) {
      const left = rnd() > .5;
      Level.road(L, z, z - 3, -HALF, HALF, 0, 0, true);
      const a = left ? [-HALF, -.4] : [.4, HALF];
      const b = left ? [.4, HALF] : [-HALF, -.4];
      Level.road(L, z - 3, z - 9, a[0], a[1], 0, 0, false);
      Level.road(L, z - 9, z - 15, b[0], b[1], 0, 0, false);
      Level.coins(L, (a[0] + a[1]) / 2, z - 4, 3, 1.8, 0);
      Level.coins(L, (b[0] + b[1]) / 2, z - 10, 3, 1.8, 0);
      Level.road(L, z - 15, z - 18, -HALF, HALF, 0, 0, true);
      return z - 18;
    },

    ramp(L, z, rnd, n) {
      const rise = 1.9, rl = 6, gap = Math.min(4.5 + n * .25, 7), land = 11;
      Level.road(L, z, z - 5, -HALF, HALF, 0, 0, true);
      Level.road(L, z - 5, z - 5 - rl, -HALF, HALF, 0, rise, true);
      const z2 = z - 5 - rl - gap;
      Level.road(L, z2, z2 - land, -HALF, HALF, 0, 0, true);
      Level.arc(L, 0, z - 5 - rl - .8, 6, gap / 6, 1.4);
      return z2 - land;
    },

    walls(L, z, rnd, n) {
      const len = 15;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.breakwall(L, z - 5);
      if (n >= 4) Level.breakwall(L, z - 11);
      Level.coins(L, LANE[Math.floor(rnd() * 3)], z - 7, 3, 1.6, 0);
      return z - len;
    },

    sliders(L, z, rnd, n) {
      const len = 17;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.slider(L, z - 6, 1.2 + n * .05, HALF - 1.25);
      if (n >= 6) Level.slider(L, z - 12.5, 1.5 + n * .05, HALF - 1.25);
      Level.coins(L, 0, z - 9, 3, 1.7, 0);
      return z - len;
    },

    spinners(L, z, rnd, n) {
      const len = 17;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.spinner(L, z - 8.5, (1 + n * .05) * (rnd() > .5 ? 1 : -1));
      return z - len;
    },

    blocks(L, z, rnd, n) {
      const len = 15;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      [5, 10].forEach(d => {
        const gapX = LANE[Math.floor(rnd() * 3)];
        [[-HALF, gapX - 1.15], [gapX + 1.15, HALF]].forEach(([a, b]) => {
          if (b - a < .5) return;
          const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, 1.4, 1), L.mats.hazard);
          m.position.set((a + b) / 2, .7, z - d);
          m.castShadow = true;
          L.group.add(m);
          L.traps.push({
            type: 'block', z: z - d, x0: a, x1: b,
            update() {},
            hit(bb) {
              if (Math.abs(bb.z - (z - d)) > .5 + BALL_R * .8) return null;
              if (bb.x < a - BALL_R * .8 || bb.x > b + BALL_R * .8 || bb.y - BALL_R > 1.35) return null;
              return { vx: bb.x < (a + b) / 2 ? -4 : 4, vz: 8 };
            },
            occ(zz) { return Math.abs(zz - (z - d)) < 1.2 ? [[a - BALL_R, b + BALL_R]] : null; }
          });
        });
        Level.coin(L, gapX, .62, z - d);
      });
      return z - len;
    },

    pistons(L, z, rnd, n) {
      const len = 20;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      // фазы разнесены: полоса всегда свободна
      const per = 2.1;
      Level.piston(L, z - 6, LANE[0], per, 0);
      Level.piston(L, z - 6, LANE[2], per, per * .5);
      Level.piston(L, z - 13, LANE[1], per, per * .25);
      Level.coins(L, LANE[1], z - 8.5, 2, 1.6, 0);
      return z - len;
    },

    lasers(L, z, rnd, n) {
      const len = 20;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      const per = 2.4;
      // на каждом рубеже закрыты 2 из 3 полос → одна всегда открыта
      Level.laser(L, z - 6, LANE[0], per, 0);
      Level.laser(L, z - 6, LANE[1], per, per * .5);
      Level.laser(L, z - 12, LANE[1], per, per * .5);
      Level.laser(L, z - 12, LANE[2], per, 0);
      Level.coins(L, LANE[2], z - 8, 2, 1.5, 0);
      return z - len;
    },

    saws(L, z, rnd, n) {
      const len = 18;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.saw(L, z - 6, -1.1, 1.1, 1.5 + n * .04);
      Level.saw(L, z - 12, 1.1, 1.1, 1.7 + n * .04);
      Level.coins(L, 0, z - 9, 2, 1.6, 0);
      return z - len;
    },

    pendulums(L, z, rnd, n) {
      const len = 22;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.pendulum(L, z - 7, .55, 1.6 + n * .03, 0);
      Level.pendulum(L, z - 15, .55, 1.6 + n * .03, Math.PI * .5);
      Level.coins(L, 0, z - 11, 2, 1.6, 0);
      return z - len;
    },

    spikefield(L, z, rnd, n) {
      const len = 20;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      const per = 1.9;
      for (let i = 0; i < 3; i++) {
        const zz = z - 5 - i * 5;
        // две из трёх полос активны в противофазе
        Level.spikes(L, zz, LANE[i % 3], per, 0);
        Level.spikes(L, zz, LANE[(i + 1) % 3], per, per * .5);
      }
      return z - len;
    },

    rollers(L, z, rnd, n) {
      const len = 18;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.roller(L, z - 6, 1.1 + n * .04, HALF - 1.3);
      Level.roller(L, z - 12.5, 1.3 + n * .04, HALF - 1.3);
      return z - len;
    },

    bumpers(L, z, rnd, n) {
      const len = 16;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.bumper(L, -1.5, z - 5); Level.bumper(L, 1.5, z - 5);
      Level.bumper(L, 0, z - 9);
      Level.bumper(L, -1.9, z - 12.5); Level.bumper(L, 1.9, z - 12.5);
      Level.coins(L, 0, z - 6.6, 2, 1.5, 0);
      return z - len;
    },

    collapse(L, z, rnd, n) {
      Level.road(L, z, z - 3, -HALF, HALF, 0, 0, true);
      let c = z - 3;
      for (let i = 0; i < 7; i++) {
        Level.collapse(L, -HALF, HALF, c, c - 2.2);
        c -= 2.2;
      }
      Level.coins(L, LANE[Math.floor(rnd() * 3)], z - 5, 5, 2, 0);
      Level.road(L, c, c - 4, -HALF, HALF, 0, 0, true);
      return c - 4;
    },

    bridge(L, z, rnd, n) {
      Level.road(L, z, z - 5, -HALF, HALF, 0, 0, true);
      // мост медленно ходит поперёк: успеваешь встать на него
      Level.bridge(L, z - 5, z - 15, 2.6, .55 + n * .012, rnd() * 6.28);
      Level.road(L, z - 15, z - 20, -HALF, HALF, 0, 0, true);
      Level.coins(L, 0, z - 17, 2, 1.6, 0);
      return z - 20;
    },

    wind(L, z, rnd, n) {
      const len = 18;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.fan(L, z - 2, 14, rnd() > .5 ? 1 : -1, 1.9 + n * .03);
      Level.coins(L, 0, z - 6, 5, 2, 0);
      return z - len;
    },

    belt(L, z, rnd, n) {
      const len = 18;
      Level.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      Level.conveyor(L, z - 2, 14, rnd() > .5 ? 1 : -1);
      Level.slider(L, z - 9, 1.3, HALF - 1.4);
      return z - len;
    },

    finish(L, z) {
      Level.road(L, z, z - 20, -HALF, HALF, 0, 0, true);
      L.finishZ = z - 15;
      Level.gate(L, L.finishZ);
      return z - 20;
    }
  },

  /* ===================== BOSS ARENA ========================== */
  bossArena(L, n, rnd, z) {
    const hp = 5 + Math.min(5, Math.floor(n / 5));
    const arena = 240 + hp * 100;
    const top = z;
    let left = arena;
    while (left > 0) {
      const l = Math.min(40, left);
      this.road(L, z, z - l, -HALF, HALF, 0, 0, true);
      left -= l; z -= l;
    }
    for (let i = 0; i < Math.floor(arena / 42); i++) {
      this.coins(L, LANE[Math.floor(rnd() * 3)], top - 8 - i * 42, 4, 1.9, 0);
    }
    // барьер: пока страж жив — прохода нет
    const wallZ = z + 16;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 1.6, 3.6, .9), L.mats.hazard);
    wall.position.set(0, 1.8, wallZ);
    wall.castShadow = true;
    L.group.add(wall);
    const wallGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2 + 1.6, 3.6),
      new THREE.MeshBasicMaterial({
        map: Tex.glow(), color: C(0xff3a2a), transparent: true, opacity: .5,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      })
    );
    wallGlow.position.set(0, 1.8, wallZ + .5);
    L.group.add(wallGlow);
    L.wall = { m: wall, glow: wallGlow, z: wallZ };
    L.traps.push({
      type: 'wall', z: wallZ, wall: true,
      update() {},
      hit(b) {
        if (Math.abs(b.z - wallZ) > .45 + BALL_R || b.y - BALL_R > 3.6) return null;
        return { vx: 0, vz: 11 };
      },
      occ(zz) { return Math.abs(zz - wallZ) < 1.5 ? [[-HALF - 1, HALF + 1]] : null; }
    });

    this.road(L, z, z - 34, -HALF, HALF, 0, 0, true);
    L.finishZ = z - 26;
    this.gate(L, L.finishZ);

    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 28, 20),
      new THREE.MeshStandardMaterial({
        map: Tex.bossSkin(), roughness: .55, metalness: .25,
        emissive: C(0x501008), emissiveIntensity: 1
      })
    );
    body.castShadow = true;
    g.add(body);
    const sg = new THREE.ConeGeometry(.26, .8, 6);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Vector3(Math.sin(i * 2.4) * Math.cos(i * 1.1), Math.cos(i * 1.7) * .9, Math.sin(i * 1.3) * .8).normalize();
      const s = new THREE.Mesh(sg, L.mats.metal);
      s.position.copy(d).multiplyScalar(1.55);
      s.quaternion.setFromUnitVectors(up, d);
      s.castShadow = true;
      g.add(s);
    }
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.2),
      new THREE.MeshBasicMaterial({ map: Tex.bossFace(), transparent: true, depthWrite: false })
    );
    face.position.z = 1.63;
    g.add(face);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Tex.glow(), color: C(0xff4020), transparent: true, opacity: .55,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    aura.scale.set(6, 6, 1);
    g.add(aura);
    g.position.set(0, 1.6, top - 18);
    L.group.add(g);

    L.boss = {
      hp, maxHp: hp, g, body, aura, face,
      x: 0, z: top - 18, state: 'run', t: 0, time: 0, inv: 0,
      next: 5, chargeX: 0, dead: false, deathT: 0
    };
    return z - 34;
  },

  /* ====================== BONUS LEVEL ======================== */
  bonus(L, n, rnd, z) {
    for (let i = 0; i < 11; i++) {
      const len = 16;
      this.road(L, z, z - len, -HALF, HALF, 0, 0, true);
      const k = i % 4;
      if (k === 0) for (let j = 0; j < 12; j++) this.coin(L, Math.sin(j * .62 + i) * 2.1, .62, z - 1.5 - j * 1.22);
      else if (k === 1) LANE.forEach(x => this.coins(L, x, z - 2, 6, 2.3, 0));
      else if (k === 2) for (let j = 0; j < 3; j++) {
        const cz = z - 3 - j * 4.6;
        this.coin(L, 0, .62, cz); this.coin(L, -1.3, .62, cz - 1.3);
        this.coin(L, 1.3, .62, cz - 1.3); this.coin(L, 0, .62, cz - 2.6);
      }
      else this.arc(L, 0, z - 2, 9, 1.5, 2.2);
      z -= len;
    }
    return this.CH.finish(L, z);
  },

  /* ======================== GENERATOR ======================== */
  T1: ['cruise', 'gap', 'narrow', 'walls'],
  T2: ['cruise', 'gap', 'narrow', 'walls', 'holes', 'blocks', 'sliders', 'gapRun'],
  T3: ['cruise', 'gap', 'narrow', 'walls', 'holes', 'blocks', 'sliders', 'gapRun',
       'zigzag', 'ramp', 'spinners', 'saws', 'collapse', 'belt'],
  T4: ['gap', 'narrow', 'walls', 'holes', 'blocks', 'sliders', 'gapRun', 'zigzag', 'ramp',
       'spinners', 'saws', 'collapse', 'belt', 'pistons', 'lasers', 'pendulums',
       'spikefield', 'rollers', 'bumpers', 'bridge', 'wind'],

  build(n) {
    this.dispose();
    const biome = biomeFor(n);
    applyBiome(biome);

    const L = {
      pieces: [], dyn: [], buckets: {}, coins: [], traps: [], decor: [],
      group: new THREE.Group(), finishZ: -100, biome,
      isBoss: n % 5 === 0, isBonus: n > 1 && n % 5 === 1,
      boss: null, wall: null, gate: null
    };

    const roadTex = Tex.road().clone(); roadTex.needsUpdate = true;
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, .08);
    const railTex = Tex.rail().clone(); railTex.needsUpdate = true;
    railTex.wrapS = railTex.wrapT = THREE.RepeatWrapping;
    railTex.repeat.set(1, 6);
    const beltTex = Tex.hazard().clone(); beltTex.needsUpdate = true;
    beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
    beltTex.repeat.set(3, 8);

    L.mats = {
      road: new THREE.MeshStandardMaterial({ map: roadTex, color: C(biome.road), roughness: .82, metalness: .05 }),
      rail: new THREE.MeshStandardMaterial({ map: railTex, color: C(biome.rail), roughness: .5, metalness: .3, emissive: C(biome.rail), emissiveIntensity: biome.sky.stars > .8 ? .5 : .06 }),
      coin: new THREE.MeshStandardMaterial({ map: Tex.coin(), roughness: .28, metalness: .85, emissive: C(0x7a4d00), emissiveIntensity: .5 }),
      coinGlow: new THREE.SpriteMaterial({ map: Tex.glow(), color: C(0xffc53d), transparent: true, opacity: .38, blending: THREE.AdditiveBlending, depthWrite: false }),
      hazard: new THREE.MeshStandardMaterial({ map: Tex.hazard(), roughness: .6, metalness: .1 }),
      brick: new THREE.MeshStandardMaterial({ map: Tex.brick(), roughness: .95, metalness: 0 }),
      metal: new THREE.MeshStandardMaterial({ map: Tex.metal(), color: C(0x9aa4bb), roughness: .35, metalness: .9 }),
      blade: new THREE.MeshStandardMaterial({ color: C(0xdfe6f5), roughness: .18, metalness: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: C(0xffc53d), roughness: .22, metalness: 1, emissive: C(0x6b4a08), emissiveIntensity: .35 }),
      bumper: new THREE.MeshStandardMaterial({ color: C(0xff5d8f), roughness: .3, metalness: .2, emissive: C(0x9e1140), emissiveIntensity: .5 }),
      belt: new THREE.MeshStandardMaterial({ map: beltTex, roughness: .8, metalness: 0 }),
      plate: new THREE.MeshStandardMaterial({ map: Tex.metal(), color: C(0xb9c4dd), roughness: .4, metalness: .8 }),
      crack: new THREE.MeshStandardMaterial({ map: Tex.road(), color: C(0xb0603a), roughness: .9, metalness: 0 }),
      deco: new THREE.MeshStandardMaterial({ color: C(biome.deco), roughness: .5, metalness: .3 }),
      deco2: new THREE.MeshStandardMaterial({ color: C(biome.rail), roughness: .35, metalness: .5, emissive: C(biome.deco), emissiveIntensity: .25 })
    };
    L.geos = { coin: new THREE.CylinderGeometry(.44, .44, .11, 20) };
    L.geos.coin.rotateX(Math.PI / 2);

    level = L;
    const rnd = rng(n * 9301 + 49297);
    let z = 6;
    // стартовый разгон
    this.road(L, z, z - 22, -HALF, HALF, 0, 0, true);
    this.coins(L, 0, z - 12, 4, 2, 0);
    z -= 22;

    let end;
    if (L.isBoss) end = this.bossArena(L, n, rnd, z);
    else if (L.isBonus) end = this.bonus(L, n, rnd, z);
    else {
      const pool = n <= 1 ? this.T1 : n <= 3 ? this.T2 : n <= 7 ? this.T3 : this.T4;
      const count = Math.min(6 + Math.floor(n * .7), 13);
      let last = '';
      for (let i = 0; i < count; i++) {
        let key = pool[Math.floor(rnd() * pool.length)];
        if (key === last) key = pool[Math.floor(rnd() * pool.length)];
        last = key;
        if (i > 0 && i % 4 === 0) this.checkpointArch(L, z);
        z = this.CH[key](L, z, rnd, n);
      }
      end = this.CH.finish(L, z);
    }
    this.decor(L, rnd, 6, end, biome);
    Gfx.scene.add(L.group);
    return L;
  },

  dispose() {
    if (!level) return;
    Gfx.scene.remove(level.group);
    level.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => {
          // текстуры из общего кэша Tex не трогаем, клоны — освобождаем
          if (m.map && m.map.isCanvasTexture && m.map.__clone) m.map.dispose();
          m.dispose();
        });
      }
    });
    Object.values(level.mats).forEach(m => m.dispose && m.dispose());
    level.geos.coin.dispose();
    level = null;
  },

  /* пол под точкой: статические секции + динамика (мосты/осыпающиеся плиты) */
  floorAt(x, z) {
    if (!level) return null;
    let bestY = null, bestP = null;
    const arr = level.buckets[Math.floor(-z / 8)];
    if (arr) {
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (z > p.zMax || z < p.zMin || x < p.x0 - .3 || x > p.x1 + .3) continue;
        const t = (p.zMax - z) / (p.zMax - p.zMin);
        const y = p.y0 + (p.y1 - p.y0) * t;
        if (bestY === null || y > bestY) { bestY = y; bestP = p; }
      }
    }
    const d = level.dyn;
    for (let i = 0; i < d.length; i++) {
      const p = d[i];
      if (p.gone || z > p.zMax || z < p.zMin || x < p.x0 - .25 || x > p.x1 + .25) continue;
      if (bestY === null || p.y0 > bestY) { bestY = p.y0; bestP = p; }
    }
    return bestY === null ? null : { y: bestY, p: bestP };
  }
};
