'use strict';
// ============================================================
//  3D-grafikk med Three.js
//  1 enhet = 1 blokk. Spill-logikken er i piksler (x, y) på bakken,
//  som blir (x / TILE, høyde, y / TILE) i 3D.
// ============================================================

const WALL_H = 2;          // vegger og fjell er 2 blokker høye
const CHAR_H = 1.5;        // en brawler er ca. 1,5 blokker høy

const R3 = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null,
  groundMesh: null, groundTex: null, worldVersion: -1,
  blockMeshes: {}, treeLeaves: null, models: new Map(), dyn: new Map(),
  particles: null, stormWall: null, nextRing: null, nextRingR: -1,
  bus: null, aimGroup: null, aimRect: null, aimSector: null, aimSectorKey: '', aimRing: null,
  ghost: null, mineBox: null, raycaster: null, groundPlane: null,
  camMode: 'fortnite', yaw: -Math.PI / 2, pitch: 0.42, lowGfx: false,
  iconTex: {}, mats: {}, tmpM: null, tmpV: null, tmpQ: null, tmpS: null, tmpC: null,
};

// ---------------- Hjelpere ----------------
function tex3(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  return t;
}

function iconTexture(name) {
  if (!R3.iconTex[name]) {
    const c = makeCanvas(32, 32);
    drawIcon(c.getContext('2d'), name, 0, 0, 32);
    R3.iconTex[name] = tex3(c);
  }
  return R3.iconTex[name];
}

function basicMat(color, opts) {
  const key = color + JSON.stringify(opts || {});
  if (!R3.mats[key]) {
    R3.mats[key] = new THREE.MeshBasicMaterial(Object.assign({ color }, opts || {}));
    R3.mats[key].userData.shared = true;
  }
  return R3.mats[key];
}

// Kolonne-boks der sideflatene gjentar teksturen i høyden (som stablede Minecraft-blokker)
function columnGeometry(h) {
  const g = new THREE.BoxGeometry(1, h, 1);
  const uv = g.attributes.uv;
  for (const face of [0, 1, 4, 5]) {
    for (let k = 0; k < 4; k++) uv.setY(face * 4 + k, uv.getY(face * 4 + k) * h);
  }
  g.translate(0, h / 2, 0);
  return g;
}

const toV3 = (x, y, h) => R3.tmpV.set(x / TILE, h, y / TILE);

// ---------------- Oppsett ----------------
function initRenderer3D() {
  const cv = document.getElementById('game3d');
  R3.lowGfx = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !R3.lowGfx, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = !R3.lowGfx;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  R3.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fd3ff');
  scene.fog = new THREE.Fog('#8fd3ff', 40, 90);
  R3.scene = scene;
  R3.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  R3.camMode = camModeInfo(storageGet('br_cam', 'fortnite')).id;

  R3.hemi = new THREE.HemisphereLight(0xe8f6ff, 0x5a7a40, 1.9);
  scene.add(R3.hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  R3.sun = sun;

  R3.tmpM = new THREE.Matrix4(); R3.tmpV = new THREE.Vector3(); R3.tmpQ = new THREE.Quaternion();
  R3.tmpS = new THREE.Vector3(); R3.tmpC = new THREE.Color();
  R3.raycaster = new THREE.Raycaster();
  R3.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);

  // Havet rundt øya
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W * 10, MAP_H * 10), new THREE.MeshLambertMaterial({ color: '#2f6fd0' }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(MAP_W / 2, -0.04, MAP_H / 2);
  scene.add(ocean);

  buildBlockMeshes();
  buildParticles();
  buildStormMeshes();
  buildBus();
  buildOverlays();
}

function buildBlockMeshes() {
  const N = MAP_W * MAP_H;
  const lambert = (map, extra) => new THREE.MeshLambertMaterial(Object.assign({ map }, extra || {}));
  const make = (geo, mat, cast = true) => {
    const m = new THREE.InstancedMesh(geo, mat, N);
    m.count = 0;
    m.castShadow = cast;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color(1, 1, 1));
    R3.scene.add(m);
    return m;
  };
  const col = columnGeometry(WALL_H);
  for (const b of [BLK.STONE, BLK.IRON, BLK.DIAMOND, BLK.PLANK, BLK.COBBLE, BLK.METAL]) {
    R3.blockMeshes[b] = make(col, lambert(tex3(Tex.top[b], true)));
  }
  // Tre: stamme + løvkrone
  const bark = pixTex(16, 16, 401, (x, y, r) => jit((x % 5 === 0) ? [86, 62, 36] : [112, 82, 48], r, 8));
  const trunkGeo = new THREE.BoxGeometry(0.45, 1.6, 0.45);
  trunkGeo.translate(0, 0.8, 0);
  R3.blockMeshes[BLK.TREE] = make(trunkGeo, lambert(tex3(bark)));
  const leafGeo = new THREE.BoxGeometry(1.3, 1.2, 1.3);
  leafGeo.translate(0, 1.95, 0);
  R3.treeLeaves = make(leafGeo, lambert(tex3(Tex.top[BLK.TREE])));
  // Kiste
  const chestSide = pixTex(16, 16, 402, (x, y) => {
    if (x === 0 || x === 15 || y === 15 || y === 0) return [60, 38, 16];
    if (y === 6 || y === 7) return [96, 60, 26];
    if (x >= 7 && x <= 8 && y >= 5 && y <= 9) return [240, 205, 70];
    return [(x + y) % 5 === 0 ? 140 : 160, (x + y) % 5 === 0 ? 90 : 104, 44];
  });
  const chestGeo = new THREE.BoxGeometry(0.8, 0.7, 0.8);
  chestGeo.translate(0, 0.35, 0);
  const cs = lambert(tex3(chestSide)), ct = lambert(tex3(Tex.top[BLK.CHEST]));
  R3.blockMeshes[BLK.CHEST] = make(chestGeo, [cs, cs, ct, cs, cs, cs]);
  // Busk
  const bushGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  bushGeo.translate(0, 0.5, 0);
  R3.blockMeshes[BLK.BUSH] = make(bushGeo, lambert(tex3(Tex.top[BLK.BUSH]), { alphaTest: 0.5, side: THREE.DoubleSide }), false);
}

function rebuildGround() {
  if (R3.groundMesh) {
    R3.scene.remove(R3.groundMesh);
    R3.groundMesh.geometry.dispose();
    R3.groundMesh.material.dispose();
    R3.groundTex.dispose();
  }
  R3.groundTex = tex3(World.groundCanvas);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_H), new THREE.MeshLambertMaterial({ map: R3.groundTex }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(MAP_W / 2, 0, MAP_H / 2);
  m.receiveShadow = true;
  R3.scene.add(m);
  R3.groundMesh = m;
}

const blockTypes3D = [BLK.TREE, BLK.STONE, BLK.IRON, BLK.DIAMOND, BLK.PLANK, BLK.COBBLE, BLK.METAL, BLK.CHEST, BLK.BUSH];

function rebuildBlockType(b) {
  const mesh = R3.blockMeshes[b];
  const leaves = b === BLK.TREE ? R3.treeLeaves : null;
  const M = R3.tmpM, Q = R3.tmpQ.identity(), S = R3.tmpS, C = R3.tmpC, P = new THREE.Vector3();
  let n = 0;
  const N = MAP_W * MAP_H, now = Game.time;
  for (let i = 0; i < N; i++) {
    if (World.block[i] !== b) continue;
    const tx = i % MAP_W, ty = (i / MAP_W) | 0;
    const age = now - World.placedT[i];
    const grow = age < 0.25 ? 0.25 + 0.75 * (age / 0.25) : 1;
    P.set(tx + 0.5, 0, ty + 0.5);
    S.set(1, grow, 1);
    M.compose(P, Q, S);
    mesh.setMatrixAt(n, M);
    const hpf = World.maxHp[i] > 0 ? World.hp[i] / World.maxHp[i] : 1;
    const v = 0.5 + 0.5 * clamp(hpf, 0, 1);
    if (age < 0.9) C.setRGB(0.6, 0.85, 1.25); else C.setRGB(v, v, v);
    if (now - World.hitT[i] < 0.08) C.setRGB(1.5, 1.5, 1.5);
    mesh.setColorAt(n, C);
    if (leaves) { leaves.setMatrixAt(n, M); leaves.setColorAt(n, C); }
    n++;
  }
  for (const m of leaves ? [mesh, leaves] : [mesh]) {
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

function syncWorld3D() {
  if (World.version !== R3.worldVersion) {
    R3.worldVersion = World.version;
    rebuildGround();
    World.dirtyAll = true;
  }
  for (const b of blockTypes3D) {
    if (World.dirtyAll || World.dirty[b]) rebuildBlockType(b);
    World.dirty[b] = 0;
  }
  World.dirtyAll = false;
}

// ---------------- Partikler (små Minecraft-kuber) ----------------
const MAX_PARTICLES = 1000;
function buildParticles() {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), MAX_PARTICLES);
  m.count = 0;
  m.frustumCulled = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, new THREE.Color());
  R3.scene.add(m);
  R3.particles = m;
}

function syncParticles() {
  const m = R3.particles, M = R3.tmpM, Q = R3.tmpQ.identity(), S = R3.tmpS, P = new THREE.Vector3(), C = R3.tmpC;
  const n = Math.min(MAX_PARTICLES, particles.length);
  for (let k = 0; k < n; k++) {
    const p = particles[k];
    const a = clamp(p.life / p.max, 0, 1);
    const s = (p.size / TILE) * 1.3 * (0.4 + 0.6 * a);
    P.set(p.x / TILE, p.z / TILE + 0.12, p.y / TILE);
    S.set(s, s, s);
    M.compose(P, Q, S);
    m.setMatrixAt(k, M);
    C.set(p.color);
    m.setColorAt(k, C);
  }
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

// ---------------- Storm ----------------
function buildStormMeshes() {
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1, 128, 1, true).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ color: '#b04dff', transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false, fog: false })
  );
  wall.renderOrder = 5;
  R3.scene.add(wall);
  R3.stormWall = wall;
  R3.nextRing = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
  R3.nextRing.rotation.x = -Math.PI / 2;
  R3.nextRing.position.y = 0.06;
  R3.scene.add(R3.nextRing);
}

function syncStorm() {
  const w = R3.stormWall;
  const r = Math.max(0.05, Storm.r / TILE);
  w.visible = Game.state !== 'menu';
  w.position.set(Storm.x / TILE, -2, Storm.y / TILE);
  w.scale.set(r, 70, r);
  w.material.opacity = 0.32 + Math.sin(Game.time * 3) * 0.05;
  const nr = Storm.nr / TILE;
  const showNext = Storm.mode === 'wait' && Game.state !== 'menu';
  R3.nextRing.visible = showNext;
  if (showNext) {
    if (Math.abs(nr - R3.nextRingR) > 0.01) {
      R3.nextRing.geometry.dispose();
      R3.nextRing.geometry = new THREE.RingGeometry(Math.max(0, nr - 0.18), nr + 0.18, 160);
      R3.nextRingR = nr;
    }
    R3.nextRing.position.x = Storm.nx / TILE;
    R3.nextRing.position.z = Storm.ny / TILE;
  }
}

// ---------------- Kampbussen ----------------
function buildBus() {
  const g = new THREE.Group();
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(3.4, 1.3, 1.5), lam('#2f6fd0'), 0, 0, 0);
  add(new THREE.BoxGeometry(3.42, 0.25, 1.52), lam('#ffd23f'), 0, -0.2, 0);
  add(new THREE.BoxGeometry(3.42, 0.2, 1.52), lam('#6fa8ff'), 0, 0.6, 0);
  for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.45, 0.4, 1.54), lam('#c8e8ff'), -1.3 + k * 0.6, 0.25, 0);
  add(new THREE.BoxGeometry(0.1, 0.55, 1.2), lam('#9fd4ff'), 1.72, 0.2, 0);
  for (const [x, z] of [[-1.1, 0.72], [1.1, 0.72], [-1.1, -0.72], [1.1, -0.72]]) {
    const w = add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), lam('#222'), x, -0.65, z);
    w.rotation.x = Math.PI / 2;
  }
  const stripes = makeCanvas(64, 32);
  const sg = stripes.getContext('2d');
  for (let k = 0; k < 8; k++) { sg.fillStyle = k % 2 ? '#3a7bd5' : '#ffffff'; sg.fillRect(k * 8, 0, 8, 32); }
  const balloon = add(new THREE.SphereGeometry(2.1, 24, 16), new THREE.MeshLambertMaterial({ map: tex3(stripes) }), 0, 3.6, 0);
  balloon.scale.set(1, 1.1, 1);
  for (const [x, z] of [[-1.4, 0.6], [1.4, 0.6], [-1.4, -0.6], [1.4, -0.6]]) {
    const rope = add(new THREE.BoxGeometry(0.04, 1.9, 0.04), lam('#333'), x * 0.7, 1.55, z * 0.7);
    rope.rotation.z = -x * 0.25;
  }
  R3.scene.add(g);
  R3.bus = g;
}

function syncBus() {
  const b = R3.bus;
  b.visible = Bus.active && Game.state === 'play';
  if (!b.visible) return;
  b.position.set(Bus.x / TILE, 13 + Math.sin(Game.time * 2) * 0.3, Bus.y / TILE);
  b.rotation.y = -Bus.ang;
}

// ---------------- Siktehjelp, byggespøkelse, graveramme ----------------
function buildOverlays() {
  const g = new THREE.Group();
  const rect = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false }));
  g.add(rect);
  R3.aimRect = rect;
  R3.scene.add(g);
  R3.aimGroup = g;
  R3.aimRing = new THREE.Group();
  const ringFill = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.15, depthWrite: false }));
  const ringEdge = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
  R3.aimRing.add(ringFill, ringEdge);
  R3.scene.add(R3.aimRing);
  R3.ghost = new THREE.Mesh(columnGeometry(WALL_H), new THREE.MeshBasicMaterial({ color: '#50ff78', transparent: true, opacity: 0.35, depthWrite: false }));
  R3.scene.add(R3.ghost);
  R3.mineBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1, 1.04).translate(0, 0.5, 0)), new THREE.LineBasicMaterial({ color: '#ffffff' }));
  R3.scene.add(R3.mineBox);
}

function blockHeight3D(b) {
  if (b === BLK.TREE) return 2.6;
  if (b === BLK.CHEST) return 0.72;
  if (b === BLK.BUSH) return 1.02;
  return WALL_H + 0.02;
}

function syncOverlays() {
  const p = player;
  R3.aimGroup.visible = false; R3.aimRing.visible = false; R3.ghost.visible = false; R3.mineBox.visible = false;
  if (!p || !p.alive || p.state !== 'play' || Game.over) return;
  const showAim = !Input.usingTouch || isLookCam() || !!Input.touch.aim;
  const slot = HOTBAR[p.slot];
  const px = p.x / TILE, pz = p.y / TILE;
  if (showAim) {
    if (slot === 'weapon') {
      const a = p.br.attack;
      if (a.type === 'nova') {
        R3.aimRing.visible = true;
        R3.aimRing.position.set(px, 0.05, pz);
        R3.aimRing.scale.setScalar(a.radius);
      } else if (a.type === 'lob') {
        const t = clampTarget(p, Input.wx, Input.wy, a.range * TILE);
        R3.aimRing.visible = true;
        R3.aimRing.position.set(t.x / TILE, 0.05, t.y / TILE);
        R3.aimRing.scale.setScalar(a.radius);
      } else {
        R3.aimGroup.visible = true;
        R3.aimGroup.position.set(px, 0.05, pz);
        R3.aimGroup.rotation.y = -p.aim;
        const cone = a.type === 'shotgun' || a.type === 'spread';
        const key = p.br.id;
        if (cone && R3.aimSectorKey !== key) {
          if (R3.aimSector) { R3.aimGroup.remove(R3.aimSector); R3.aimSector.geometry.dispose(); }
          const sp = a.spread + 0.1;
          R3.aimSector = new THREE.Mesh(new THREE.CircleGeometry(a.range, 24, -sp / 2, sp).rotateX(-Math.PI / 2), R3.aimRect.material);
          R3.aimGroup.add(R3.aimSector);
          R3.aimSectorKey = key;
        }
        if (R3.aimSector) R3.aimSector.visible = cone;
        R3.aimRect.visible = !cone;
        R3.aimRect.scale.set(a.range, 1, 0.38);
      }
    } else if (slot in MAT_BLOCK) {
      const tx = tileOf(Input.wx), ty = tileOf(Input.wy);
      const ok = canBuildAt(p, tx, ty) && p.mats[slot] >= buildCost(p);
      R3.ghost.visible = true;
      R3.ghost.position.set(tx + 0.5, 0, ty + 0.5);
      R3.ghost.material.color.set(ok ? '#50ff78' : '#ff4646');
    } else if (slot === 'tnt' || slot === 'turret') {
      const t = clampTarget(p, Input.wx, Input.wy, (slot === 'tnt' ? 7 : 3) * TILE);
      R3.aimRing.visible = true;
      R3.aimRing.position.set(t.x / TILE, 0.05, t.y / TILE);
      R3.aimRing.scale.setScalar(slot === 'tnt' ? 2.3 : 0.45);
    }
  }
  const free = Input.usingTouch && !isLookCam();
  const mt = mineTarget(p, p.aim, free ? null : Input.wx, free ? null : Input.wy);
  if (mt) {
    const b = getBlock(mt.tx, mt.ty);
    R3.mineBox.visible = true;
    R3.mineBox.position.set(mt.tx + 0.5, 0, mt.ty + 0.5);
    R3.mineBox.scale.set(1, blockHeight3D(b), 1);
  }
}

// ---------------- 3D-figurer (brawlere) ----------------
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

function buildCharacterModel(br) {
  const L = br.look;
  const mats = [];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const k = 0.05 * (br.r / 17);
  body.scale.setScalar(k);
  const box = (parent, w, h, d, color, x, y, z) => {
    const m = new THREE.MeshLambertMaterial({ color });
    mats.push(m);
    const mesh = new THREE.Mesh(UNIT_BOX, m);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const pivot = (parent, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
  const golem = !!L.golem;
  const bw = golem ? 13 : 9, aw = golem ? 4.5 : 3.5, sx = bw / 2 + aw / 2;

  const legL = pivot(body, -2.3, 10, 0), legR = pivot(body, 2.3, 10, 0);
  box(legL, 4.2, 10, 4.2, L.pants, 0, -5, 0);
  box(legR, 4.2, 10, 4.2, L.pants, 0, -5, 0);
  box(body, bw, 10.5, golem ? 7 : 5.2, L.shirt, 0, 15.2, 0);
  if (L.witch) { box(body, 10, 6, 6, L.shirt, 0, 7.5, 0); box(body, 9.4, 1.2, 5.6, '#ffd23f', 0, 12, 0); }
  if (golem) { box(body, 2, 8, 7.4, '#4e8f3a', -3, 16, 0); box(body, 2, 5, 7.4, '#4e8f3a', 4, 13, 0); }
  if (L.helmet) box(body, 9.4, 1.5, 5.6, '#e6f04a', 0, 13, 0);
  if (L.hood) box(body, 9.4, 1.2, 5.6, '#7a5230', 0, 11, 0);

  const head = pivot(body, 0, 20.5, 0);
  const hs = golem ? 11 : 10;
  box(head, hs, hs, hs, L.skin, 0, hs / 2, 0);
  if (L.hair) {
    box(head, hs + 0.6, 3, hs + 0.6, L.hair, 0, hs - 1.2, 0);
    box(head, hs + 0.6, hs - 3, 2, L.hair, 0, hs / 2 + 0.5, -hs / 2 - 0.2);
  }
  const fz = hs / 2 + 0.2;
  if (golem) {
    box(head, hs + 0.2, 1.6, 0.6, '#5b5850', 0, hs * 0.66, fz);
    box(head, 1.6, 1.6, 0.6, '#ff3a3a', -2.4, hs * 0.55, fz);
    box(head, 1.6, 1.6, 0.6, '#ff3a3a', 2.4, hs * 0.55, fz);
    box(head, 2.2, 4.5, 1.8, '#a8a397', 0, hs * 0.35, fz + 0.6);
  } else if (L.creeper) {
    // Det klassiske creeper-fjeset
    for (const sx2 of [-2.4, 2.4]) box(head, 2.6, 2.6, 0.5, '#111', sx2, hs * 0.62, fz);
    box(head, 2.2, 3.4, 0.5, '#111', 0, hs * 0.36, fz);
    for (const sx2 of [-1.7, 1.7]) box(head, 1.4, 2.4, 0.5, '#111', sx2, hs * 0.22, fz);
    box(body, bw + 0.2, 2, 5.4, '#3d8b40', 0, 18, 0);
    box(body, 3, 3, 5.4, '#6fd36f', -2, 13, 0);
  } else if (L.ender) {
    const eyeM = basicMat('#e070ff');
    for (const sx2 of [-2.6, 2.6]) {
      const e = new THREE.Mesh(UNIT_BOX, eyeM);
      e.scale.set(3.2, 1.3, 0.5);
      e.position.set(sx2, hs * 0.52, fz);
      head.add(e);
    }
  } else {
    box(head, 2.4, 1.8, 0.5, '#ffffff', -2.4, hs * 0.52, fz);
    box(head, 2.4, 1.8, 0.5, '#ffffff', 2.4, hs * 0.52, fz);
    const pupil = L.witch ? '#cc00ff' : '#3b2a7a';
    box(head, 1.2, 1.8, 0.6, pupil, -1.8, hs * 0.52, fz + 0.05);
    box(head, 1.2, 1.8, 0.6, pupil, 1.8, hs * 0.52, fz + 0.05);
    box(head, 3.4, 0.9, 0.5, '#7a3b2a', 0, hs * 0.24, fz);
  }
  if (L.hood) {
    box(head, hs + 1.6, 1.6, hs + 1.6, L.hood, 0, hs + 0.6, 0);
    box(head, hs + 1.6, hs, 1.4, L.hood, 0, hs / 2, -hs / 2 - 0.6);
    box(head, 1.4, hs, hs + 1.6, L.hood, -hs / 2 - 0.6, hs / 2, 0);
    box(head, 1.4, hs, hs + 1.6, L.hood, hs / 2 + 0.6, hs / 2, 0);
  }
  if (L.goggles) {
    box(head, hs + 0.8, 1.6, hs + 0.8, '#3a2a1a', 0, hs * 0.78, 0);
    for (const sx2 of [-2.4, 2.4]) box(head, 3.4, 2.8, 1, L.goggles, sx2, hs * 0.78, fz + 0.4);
  }
  if (L.helmet) {
    box(head, hs + 1.2, 4, hs + 1.2, L.helmet, 0, hs + 1, 0);
    box(head, hs + 2.4, 1, hs + 3.4, L.helmet, 0, hs - 0.6, 1);
    box(head, 2, 4.2, hs + 1.4, '#fff27a', 0, hs + 1.1, 0);
  }
  if (L.witch) {
    const m = new THREE.MeshLambertMaterial({ color: L.witch });
    mats.push(m);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.8, 16), m);
    brim.position.y = hs + 0.3;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 13, 8), m);
    cone.position.set(0, hs + 7, -1);
    cone.rotation.x = -0.25;
    brim.castShadow = cone.castShadow = true;
    head.add(brim, cone);
    box(head, 11.5, 1.3, 11.5, '#ffd23f', 0, hs + 1.2, 0);
  }

  const armL = pivot(body, -sx, 19.5, 0), armR = pivot(body, sx, 19.5, 0);
  box(armL, aw, 10, aw, L.shirt, 0, -4, 0);
  box(armL, aw, 2.5, aw, L.skin, 0, -9.5, 0);
  box(armR, aw, 10, aw, L.shirt, 0, -4, 0);
  box(armR, aw, 2.5, aw, L.skin, 0, -9.5, 0);

  // Våpen i høyre hånd (armen peker fremover når den sikter)
  const gun = new THREE.Group();
  armR.add(gun);
  const t = br.attack.type;
  if (t === 'lob') {
    box(gun, 4, 4.5, 4, '#3fd0ff', 0, -13, 0);
    box(gun, 1.8, 2, 1.8, '#cfe8ff', 0, -16, 0);
  } else if (t === 'nova') {
    // Ingen våpen – Kalle eksploderer selv
  } else if (t === 'rocket') {
    box(gun, 4.8, 17, 4.8, L.gun, 0, -13, 0);
    box(gun, 3.6, 1.5, 3.6, '#ff5a3a', 0, -21.5, 0);
    box(gun, 2, 4, 2, '#222', 0, -9, 3);
  } else if (t === 'single') {
    box(gun, 2, 10, 2, L.gun, 0, -14, 0);
    box(gun, 12, 1.2, 1.2, '#3a2410', 0, -17, 0);
  } else {
    const len = t === 'shotgun' ? 11 : 8;
    box(gun, 3, len, 3.6, L.gun, 0, -10 - len / 2, 0);
    box(gun, 2, 1.5, 2.4, '#222', 0, -10 - len, 0);
  }
  const pick = new THREE.Group();
  armR.add(pick);
  box(pick, 1.3, 12, 1.3, '#7a5230', 0, -14, 0);
  box(pick, 10, 2, 2, '#6ff0e8', 0, -19.5, 0);
  pick.visible = false;

  // Super-ring og glidefallskjerm
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 * (br.r / 17), 0.05, 6, 32), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  root.add(ring);
  const chute = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, TAU, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: br.color, side: THREE.DoubleSide }));
  dome.scale.y = 0.6;
  dome.position.y = 2.6;
  chute.add(dome);
  for (const [x, z] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
    const s = new THREE.Mesh(UNIT_BOX, basicMat('#222'));
    s.scale.set(0.03, 1.3, 0.03);
    s.position.set(x * 0.6, 1.95, z * 0.6);
    s.rotation.set(z * 0.45, 0, -x * 0.45);
    chute.add(s);
  }
  root.add(chute);

  return { root, body, legL, legR, armL, armR, head, gun, pick, ring, chute, mats, flash: false, alpha: 1 };
}

function setModelLook(md, flash, alpha) {
  if (md.flash === flash && md.alpha === alpha) return;
  md.flash = flash;
  md.alpha = alpha;
  for (const m of md.mats) {
    m.emissive.setRGB(flash ? 0.9 : 0, flash ? 0.9 : 0, flash ? 0.9 : 0);
    m.transparent = alpha < 1;
    m.opacity = alpha;
    m.needsUpdate = true;
  }
}

function disposeModel(md) {
  R3.scene.remove(md.root);
  disposeObject(md.root);
}

function syncFighters() {
  const seen = new Set();
  for (const f of fighters) {
    if (!f.alive || f.state === 'bus') continue;
    seen.add(f.id);
    let md = R3.models.get(f.id);
    if (!md) {
      md = buildCharacterModel(f.br);
      R3.scene.add(md.root);
      R3.models.set(f.id, md);
    }
    const hidden = isHiddenFromPlayer(f) || (f === player && R3.camMode === 'fps' && f.state === 'play');
    md.root.visible = !hidden;
    if (hidden) continue;
    const glide = f.state === 'glide';
    const lift = glide ? 1 + 8 * clamp(f.glideT / 3.4, 0, 1) : 0;
    md.root.position.set(f.x / TILE, lift, f.y / TILE);
    md.root.rotation.y = Math.PI / 2 - f.aim;
    md.chute.visible = glide;
    md.ring.visible = f.superCharge >= 1 && !glide;
    if (md.ring.visible) md.ring.material.opacity = 0.55 + Math.sin(Game.time * 8) * 0.35;
    const sw = f.moving ? Math.sin(f.walkT) : 0;
    md.legL.rotation.x = sw * 0.7;
    md.legR.rotation.x = -sw * 0.7;
    md.armL.rotation.x = glide ? -2.8 : -sw * 0.6;
    if (f.swingT > 0) {
      const k = 1 - f.swingT / 0.2;
      md.armR.rotation.x = -2.7 + k * 2.3;
      md.pick.visible = true;
      md.gun.visible = false;
    } else {
      md.armR.rotation.x = glide ? -2.8 : -Math.PI / 2;
      md.pick.visible = false;
      md.gun.visible = !glide;
    }
    md.body.position.y = f.inWater ? -0.25 : 0;
    setModelLook(md, f.flash > 0, f.inBush ? 0.5 : 1);
  }
  for (const [id, md] of R3.models) {
    if (!seen.has(id)) { disposeModel(md); R3.models.delete(id); }
  }
}

// ---------------- Dynamiske ting: skudd, loot, tårn, skyer, eksplosjoner ----------------
function dynFor(obj, create) {
  let m = R3.dyn.get(obj);
  if (!m) {
    m = create();
    R3.scene.add(m);
    R3.dyn.set(obj, m);
  }
  m.userData.seen = R3.frame;
  return m;
}

const SPHERE_G = new THREE.SphereGeometry(1, 10, 8);
const CYL_G = new THREE.CylinderGeometry(1, 1, 1, 24);
for (const g of [UNIT_BOX, SPHERE_G, CYL_G]) g.userData.shared = true;

function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material && !o.material.userData.shared) o.material.dispose();
  });
}

function makeProjectileMesh(p) {
  if (p.lob) {
    const g = new THREE.Group();
    let body;
    if (p.kind === 'rocketlob') {
      body = new THREE.Mesh(UNIT_BOX, basicMat('#e74c3c'));
      body.scale.set(0.16, 0.16, 0.42);
    } else if (p.kind === 'tnt') {
      const t = iconTexture('tnt');
      body = new THREE.Mesh(UNIT_BOX, new THREE.MeshLambertMaterial({ map: t }));
      body.scale.setScalar(p.big ? 0.6 : 0.45);
    } else {
      body = new THREE.Mesh(SPHERE_G, basicMat(p.kind === 'cloud' ? '#9dff7a' : '#5aa8ff'));
      body.scale.setScalar(0.18);
    }
    body.castShadow = true;
    g.add(body);
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32).rotateX(-Math.PI / 2), basicMat('#ff5050', { transparent: true, opacity: 0.6, depthWrite: false }));
    mark.scale.setScalar((p.radius || 30) / TILE);
    g.add(mark);
    g.userData.body = body;
    g.userData.mark = mark;
    return g;
  }
  if (p.kind === 'rocket') {
    const g = new THREE.Group();
    const bodyM = new THREE.Mesh(UNIT_BOX, basicMat('#d63a2a'));
    bodyM.scale.set(0.14, 0.14, 0.46);
    const nose = new THREE.Mesh(UNIT_BOX, basicMat('#f2f2f2'));
    nose.scale.set(0.1, 0.1, 0.12);
    nose.position.z = 0.28;
    const fin = new THREE.Mesh(UNIT_BOX, basicMat('#333'));
    fin.scale.set(0.3, 0.04, 0.1);
    fin.position.z = -0.2;
    const flame = new THREE.Mesh(UNIT_BOX, basicMat('#ffb030'));
    flame.scale.set(0.09, 0.09, 0.2);
    flame.position.z = -0.32;
    g.add(bodyM, nose, fin, flame);
    return g;
  }
  if (p.kind === 'arrow') {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(UNIT_BOX, basicMat('#7a5230'));
    shaft.scale.set(0.05, 0.05, 0.6);
    const tip = new THREE.Mesh(UNIT_BOX, basicMat('#6ff0e8'));
    tip.scale.set(0.12, 0.12, 0.14);
    tip.position.z = 0.32;
    g.add(shaft, tip);
    return g;
  }
  const m = new THREE.Mesh(SPHERE_G, basicMat(p.color));
  m.scale.setScalar(p.r / TILE * 1.4);
  return m;
}

function makePickupMesh(p) {
  const g = new THREE.Group();
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(p.type), transparent: true }));
  spr.scale.setScalar(0.62);
  g.add(spr);
  const beam = new THREE.Mesh(UNIT_BOX, basicMat(RARITY[p.type] || '#ffffff', { transparent: true, opacity: 0.35, depthWrite: false }));
  beam.scale.set(0.08, 2.2, 0.08);
  beam.position.y = 1.3;
  g.add(beam);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2), basicMat(RARITY[p.type] || '#ffffff', { transparent: true, opacity: 0.35, depthWrite: false }));
  glow.position.y = 0.03;
  g.add(glow);
  g.userData.spr = spr;
  return g;
}

function makeTurretMesh(tu) {
  const g = new THREE.Group();
  if (!R3.turretTex) R3.turretTex = tex3(Tex.top[BLK.COBBLE], true);
  const base = new THREE.Mesh(columnGeometry(1), new THREE.MeshLambertMaterial({ map: R3.turretTex }));
  base.scale.set(0.7, 0.55, 0.7);
  base.castShadow = true;
  g.add(base);
  const head = new THREE.Group();
  head.position.y = 0.75;
  const hb = new THREE.Mesh(UNIT_BOX, new THREE.MeshLambertMaterial({ color: '#4a525c' }));
  hb.scale.set(0.45, 0.35, 0.45);
  const barrel = new THREE.Mesh(UNIT_BOX, new THREE.MeshLambertMaterial({ color: '#2a2f35' }));
  barrel.scale.set(0.13, 0.13, 0.6);
  barrel.position.z = 0.35;
  const lamp = new THREE.Mesh(UNIT_BOX, basicMat(tu.owner.isPlayer ? '#4cff5a' : '#ff4a4a'));
  lamp.scale.set(0.14, 0.1, 0.14);
  lamp.position.y = 0.22;
  hb.castShadow = barrel.castShadow = true;
  head.add(hb, barrel, lamp);
  g.add(head);
  g.userData.head = head;
  return g;
}

function syncDynamic() {
  R3.frame = (R3.frame || 0) + 1;
  for (const p of projectiles) {
    const m = dynFor(p, () => makeProjectileMesh(p));
    if (p.lob) {
      m.position.set(p.tx / TILE, 0.05, p.ty / TILE);
      m.userData.body.position.set((p.x - p.tx) / TILE, 0.8 + p.z / TILE, (p.y - p.ty) / TILE);
      m.userData.body.rotation.set(p.t * 8, p.t * 6, 0);
    } else {
      m.position.set(p.x / TILE, 0.8, p.y / TILE);
      m.rotation.y = Math.PI / 2 - p.ang;
    }
  }
  for (const p of pickups) {
    const m = dynFor(p, () => makePickupMesh(p));
    m.position.set(p.x / TILE, 0, p.y / TILE);
    m.userData.spr.position.y = 0.55 + Math.sin(Game.time * 4 + p.x) * 0.08;
  }
  for (const tu of turrets) {
    const m = dynFor(tu, () => makeTurretMesh(tu));
    m.position.set(tu.x / TILE, 0, tu.y / TILE);
    m.userData.head.rotation.y = Math.PI / 2 - tu.aim;
  }
  for (const c of clouds) {
    const m = dynFor(c, () => new THREE.Mesh(CYL_G, basicMat('#8dff6a', { transparent: true, opacity: 0.3, depthWrite: false })));
    const r = (c.r / TILE) * (0.95 + Math.sin(Game.time * 6) * 0.05);
    m.position.set(c.x / TILE, 0.4, c.y / TILE);
    m.scale.set(r, 0.8, r);
  }
  for (const b of blasts) {
    const m = dynFor(b, () => new THREE.Mesh(SPHERE_G, new THREE.MeshBasicMaterial({ color: `rgb(${b.color})`, transparent: true, depthWrite: false })));
    const k = b.t / b.dur;
    m.position.set(b.x / TILE, 0.4, b.y / TILE);
    m.scale.setScalar((b.r / TILE) * (0.4 + 0.6 * k));
    m.material.opacity = 0.6 * (1 - k);
  }
  for (const bm of beams) {
    const m = dynFor(bm, () => {
      const g = new THREE.Group();
      const outer = new THREE.Mesh(CYL_G, new THREE.MeshBasicMaterial({ color: '#6efaff', transparent: true, depthWrite: false }));
      const inner = new THREE.Mesh(CYL_G, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
      g.add(outer, inner);
      const a = new THREE.Vector3(bm.x1 / TILE, 0.8, bm.y1 / TILE), b = new THREE.Vector3(bm.x2 / TILE, 0.8, bm.y2 / TILE);
      const len = a.distanceTo(b);
      g.position.copy(a).add(b).multiplyScalar(0.5);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      outer.scale.set(0.3, len, 0.3);
      inner.scale.set(0.1, len, 0.1);
      g.userData.len = len;
      return g;
    });
    const k = clamp(bm.t / bm.max, 0, 1);
    m.children[0].material.opacity = 0.6 * k;
    m.children[1].material.opacity = k;
    m.children[0].scale.set(0.35 * k, m.userData.len, 0.35 * k);
  }
  for (const [obj, m] of R3.dyn) {
    if (m.userData.seen !== R3.frame) {
      R3.scene.remove(m);
      disposeObject(m);
      R3.dyn.delete(obj);
    }
  }
}

function clearDynamic3D() {
  for (const [, m] of R3.dyn) { R3.scene.remove(m); disposeObject(m); }
  R3.dyn.clear();
  for (const [, md] of R3.models) disposeModel(md);
  R3.models.clear();
}

// ---------------- Kamera ----------------
function cameraTarget() {
  if (player && player.alive) return player;
  if (!Game.spectate || !Game.spectate.alive) Game.spectate = fighters.find((f) => f.alive) || null;
  return Game.spectate;
}

function updateCamera3D(dt) {
  const cam = R3.camera;
  const shake = Game.cam.shake * 0.02;
  const sh = () => (shake > 0 ? rand(-1, 1) * shake : 0);
  let fogNear = 28, fogFar = 70;
  if (Game.state === 'menu') {
    const t = Game.menuT * 0.06;
    cam.position.set(MAP_W / 2 + Math.cos(t) * 62, 42, MAP_H / 2 + Math.sin(t) * 62);
    cam.lookAt(MAP_W / 2, 0, MAP_H / 2);
    fogNear = 90; fogFar = 220;
  } else {
    const tg = cameraTarget();
    const aspectBoost = W < H ? 1.35 : 1;
    if (tg && tg.state === 'bus') {
      const bx = Bus.x / TILE, bz = Bus.y / TILE;
      const fx = Math.cos(R3.yaw), fz = Math.sin(R3.yaw);
      const want = R3.tmpV.set(bx - fx * 16, 22, bz - fz * 16);
      if (!isLookCam()) want.set(bx, 32 * aspectBoost, bz + 20 * aspectBoost);
      cam.position.lerp(want, 1 - Math.pow(0.02, dt));
      cam.lookAt(bx, 6, bz);
      fogNear = 60; fogFar = 170;
    } else if (tg) {
      const gl = tg.state === 'glide' ? clamp(tg.glideT / 3.4, 0, 1) : 0;
      const x = tg.x / TILE, z = tg.y / TILE, y = gl * 8;
      let mode = tg === player ? R3.camMode : 'brawl';
      if (mode === 'fps' && gl > 0) mode = 'fortnite';
      if (mode === 'brawl' || mode === 'bird') {
        const bird = mode === 'bird';
        const h = ((bird ? 24 : 13) + gl * 10) * aspectBoost, back = ((bird ? 2.5 : 9) + gl * 6) * aspectBoost;
        const want = R3.tmpV.set(x + sh(), y + h + sh(), z + back);
        cam.position.lerp(want, 1 - Math.pow(0.0005, dt));
        cam.lookAt(x, y, z - (bird ? 0.2 : 0.6));
        fogNear = (bird ? 40 : 30) + gl * 30; fogFar = (bird ? 95 : 75) + gl * 60;
      } else if (mode === 'fps') {
        // Førsteperson: kameraet sitter i øynene til brawleren
        const fx = Math.cos(R3.yaw), fz = Math.sin(R3.yaw);
        const look = R3.pitch - 0.45;
        const eye = CHAR_H * (tg.br.r / 17) * 0.88 + (tg.inWater ? -0.25 : 0);
        cam.position.set(x + fx * 0.22 + sh(), y + eye + sh(), z + fz * 0.22);
        cam.lookAt(cam.position.x + fx * Math.cos(look), cam.position.y - Math.sin(look), cam.position.z + fz * Math.cos(look));
        fogNear = 24; fogFar = 60;
      } else {
        // Fortnite (bak karakteren) og Skulder (tett over skulderen)
        const close = mode === 'shoulder';
        const fx = Math.cos(R3.yaw), fz = Math.sin(R3.yaw);
        const rx = -fz, rz = fx;
        const side = close ? 1.0 : 0.55;
        const hx = x + rx * side, hz = z + rz * side, hy = y + (close ? 1.5 : 1.65);
        const maxD = (close ? 3.0 : 6.2) + gl * 4;
        // Er det trangt bak deg, løftes kameraet over veggene i stedet for å krype inntil deg
        let pitch = R3.pitch, dist = 0;
        for (const pc of [R3.pitch, 0.75, 0.95, 1.15, 1.3]) {
          if (pc < R3.pitch) continue;
          const d = cameraClearDistance(hx, hy, hz, -fx * Math.cos(pc), Math.sin(pc), -fz * Math.cos(pc), maxD);
          if (d > dist + 0.01) { dist = d; pitch = pc; }
          if (d >= Math.min(maxD, 2.8)) break;
        }
        R3.camPitchNow = lerp(R3.camPitchNow || pitch, pitch, 1 - Math.pow(0.001, dt));
        pitch = R3.camPitchNow;
        dist = cameraClearDistance(hx, hy, hz, -fx * Math.cos(pitch), Math.sin(pitch), -fz * Math.cos(pitch), maxD);
        cam.position.set(hx - fx * dist * Math.cos(pitch) + sh(), hy + dist * Math.sin(pitch) + sh(), hz - fz * dist * Math.cos(pitch));
        const ahead = close ? 6 : 8;
        cam.lookAt(hx + fx * ahead, hy - (close ? 0.3 : 0.5), hz + fz * ahead);
        fogNear = 26; fogFar = 64;
      }
    }
  }
  const outside = player && player.alive && player.state === 'play' && outsideStorm(player.x, player.y);
  const fogCol = outside ? '#8a4ac8' : '#8fd3ff';
  R3.scene.fog.color.set(fogCol);
  R3.scene.background.set(fogCol);
  R3.scene.fog.near = outside ? 6 : fogNear;
  R3.scene.fog.far = outside ? 30 : fogFar;
  // Sola følger kameraet slik at skyggene alltid er skarpe der du er
  const tg = Game.state === 'menu' ? null : cameraTarget();
  const cx = tg ? tg.x / TILE : MAP_W / 2, cz = tg ? tg.y / TILE : MAP_H / 2;
  R3.sun.position.set(cx - 14, 30, cz + 10);
  R3.sun.target.position.set(cx, 0, cz);
  // Lydkamera (for avstandsdemping) følger målet
  if (tg) { Game.cam.x = tg.state === 'bus' ? Bus.x : tg.x; Game.cam.y = tg.state === 'bus' ? Bus.y : tg.y; }
}

// Hvor langt bak spilleren kan kameraet stå før det havner inni en blokk?
function cameraClearDistance(hx, hy, hz, dx, dy, dz, maxD) {
  for (let t = 0.6; t <= maxD; t += 0.2) {
    const x = hx + dx * t, y = hy + dy * t, z = hz + dz * t;
    const b = getBlock(Math.floor(x), Math.floor(z));
    if (b > 0 && y < blockHeight3D(b) + 0.3) return Math.max(0.8, t - 0.35);
  }
  return maxD;
}

// Skjermkoordinater → punkt på bakken (i spillets piksel-koordinater)
function screenToWorld(sx, sy) {
  const ndc = new THREE.Vector2((sx / W) * 2 - 1, -(sy / H) * 2 + 1);
  R3.raycaster.setFromCamera(ndc, R3.camera);
  const hit = new THREE.Vector3();
  if (!R3.raycaster.ray.intersectPlane(R3.groundPlane, hit)) return null;
  return { x: hit.x * TILE, y: hit.z * TILE };
}

function worldToScreen(x, h, y) {
  const v = R3.tmpV.set(x / TILE, h, y / TILE).project(R3.camera);
  if (v.z > 1 || v.z < -1) return null;
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
}

const camModeInfo = (id = R3.camMode) => CAMERA_MODES.find((m) => m.id === id) || CAMERA_MODES[0];
const isLookCam = () => camModeInfo().look;

function setCameraMode(id, quiet) {
  const prevLook = isLookCam();
  R3.camMode = camModeInfo(id).id;
  storageSet('br_cam', R3.camMode);
  if (!isLookCam() && document.pointerLockElement) releasePointer();
  if (isLookCam() && !prevLook && player) R3.yaw = player.aim;
  if (Input.usingTouch) updateTouchButtons();
  const m = camModeInfo();
  if (!quiet && Game.state === 'play') announce(`${m.icon} Kamera: ${m.name} – ${m.desc}`, '#fff', 0.7);
}

function cycleCamera() {
  const i = CAMERA_MODES.findIndex((m) => m.id === R3.camMode);
  setCameraMode(CAMERA_MODES[(i + 1) % CAMERA_MODES.length].id);
}

// ---------------- 2D-lag oppå 3D: navn, livsbarer, skadetall ----------------
function drawOverhead2D(g, f, x, y, scale) {
  const w = 58 * scale, h = 8 * scale, bx = x - w / 2;
  const enemy = !f.isPlayer;
  outlinedText(g, f.isPlayer ? 'DU' : f.name, x, y - 13 * scale, Math.round(12 * scale), enemy ? '#ffb4b4' : '#a8ffb0');
  drawBar(g, bx, y, w, h, f.hp / f.maxHp, enemy ? '#ff4a4a' : '#4cff5a', f.shield / f.maxHp);
  outlinedText(g, Math.ceil(f.hp + f.shield), x, y + h / 2, Math.round(9 * scale), '#fff');
  if (f.cubes > 0) {
    drawIcon(g, 'cube', bx - 18 * scale, y - 5 * scale, 16 * scale);
    outlinedText(g, f.cubes, bx - 10 * scale, y + 3 * scale, Math.round(10 * scale), '#fff');
  }
  if (f.isPlayer) {
    for (let k = 0; k < 3; k++) {
      const fill = clamp(f.ammo - k, 0, 1);
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(bx + k * 20 * scale - 1, y + h + 3, 18 * scale + 2, 6);
      g.fillStyle = fill >= 1 ? '#ff9a1f' : '#8a5a20';
      g.fillRect(bx + k * 20 * scale, y + h + 4, 18 * scale * fill, 4);
    }
  }
}

function drawWorldOverlay(g) {
  if (Game.state === 'menu') return;
  const camPos = R3.camera.position;
  for (const f of fighters) {
    if (!f.alive || f.state === 'bus' || isHiddenFromPlayer(f)) continue;
    if (f === player && R3.camMode === 'fps' && f.state === 'play') continue;
    const glide = f.state === 'glide';
    const lift = glide ? 1 + 8 * clamp(f.glideT / 3.4, 0, 1) + 2.4 : 0;
    const s = worldToScreen(f.x, lift + CHAR_H * (f.br.r / 17) + 0.45, f.y);
    if (!s) continue;
    const d = camPos.distanceTo(R3.tmpV.set(f.x / TILE, 1, f.y / TILE));
    const scale = clamp(9 / d, 0.65, 1.15);
    if (glide) { if (!f.isPlayer) outlinedText(g, f.name, s.x, s.y, 12, '#ffb4b4'); continue; }
    drawOverhead2D(g, f, s.x, s.y, scale);
  }
  for (const tu of turrets) {
    const s = worldToScreen(tu.x, 1.25, tu.y);
    if (s) drawBar(g, s.x - 20, s.y, 40, 5, tu.hp / tu.maxHp, tu.owner.isPlayer ? '#4cff5a' : '#ff4a4a', 0);
  }
  for (const p of pickups) {
    if (p.amount <= 1) continue;
    const s = worldToScreen(p.x, 0.25, p.y);
    if (s) outlinedText(g, p.amount, s.x + 14, s.y, 12, '#fff');
  }
  for (const t of texts) {
    const s = worldToScreen(t.x, 1.9 + (t.y0 - t.y) / TILE, t.y0 + 50);
    if (!s) continue;
    g.globalAlpha = clamp(t.life * 1.5, 0, 1);
    outlinedText(g, t.text, s.x, s.y, Math.round(18 * t.size), t.color);
  }
  g.globalAlpha = 1;
  if (Bus.active && Game.state === 'play') {
    const s = worldToScreen(Bus.x, 11.3, Bus.y);
    if (s) outlinedText(g, 'KAMPBUSSEN', s.x, s.y, 16, '#fff');
  }
}

// ---------------- Hovedtegning ----------------
function resize3D() {
  if (!R3.renderer) return;
  R3.renderer.setPixelRatio(R3.lowGfx ? 1 : Math.min(2, window.devicePixelRatio || 1));
  R3.renderer.setSize(W, H, false);
  R3.camera.aspect = W / H;
  R3.camera.updateProjectionMatrix();
}

function render() {
  if (!World.groundCanvas) return;
  flushMinimap();
  syncWorld3D();
  syncParticles();
  syncStorm();
  syncBus();
  if (Game.state === 'play') {
    syncFighters();
    syncDynamic();
    syncOverlays();
  }
  updateCamera3D(Math.min(0.05, R3.lastDt || 0.016));
  R3.renderer.render(R3.scene, R3.camera);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (Game.state !== 'menu') {
    drawWorldOverlay(ctx);
    drawHUD(ctx);
  }
}
