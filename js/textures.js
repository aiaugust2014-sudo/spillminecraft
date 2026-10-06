'use strict';
// ============================================================
//  Prosedyrisk pikselgrafikk (16x16 teksturer i Minecraft-stil)
// ============================================================

const Tex = { ground: [], top: [], side: [], crack: [], groundRGB: [] };

function pixTex(w, h, seed, fn) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const rng = mulberry32(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = fn(x, y, rng);
      if (!col) continue;
      const i = (y * w + x) * 4;
      img.data[i] = clamp(col[0], 0, 255);
      img.data[i + 1] = clamp(col[1], 0, 255);
      img.data[i + 2] = clamp(col[2], 0, 255);
      img.data[i + 3] = col.length > 3 ? col[3] : 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function jit(c, rng, amt) {
  const d = (rng() - 0.5) * 2 * amt;
  return [c[0] + d, c[1] + d, c[2] + d];
}

function makeSpots(rng, n, size) {
  const spots = [];
  for (let i = 0; i < n; i++) {
    const cx = 2 + Math.floor(rng() * 12), cy = 2 + Math.floor(rng() * 12);
    for (let k = 0; k < size; k++) {
      spots.push((cy + Math.floor(rng() * 3) - 1) * 16 + cx + Math.floor(rng() * 3) - 1);
    }
  }
  return new Set(spots);
}

function stoneFn(x, y, r) {
  if (r() < 0.07) return jit([96, 96, 96], r, 8);
  return jit([126, 126, 126], r, 14);
}

function oreTex(seed, light, dark) {
  const sr = mulberry32(seed * 7 + 3);
  const spots = makeSpots(sr, 5, 4);
  return pixTex(16, 16, seed, (x, y, r) => {
    if (spots.has(y * 16 + x)) return jit(r() < 0.5 ? light : dark, r, 10);
    return stoneFn(x, y, r);
  });
}

function plankFn(base, dark) {
  return (x, y, r) => {
    const row = y % 4;
    if (row === 3) return jit(dark, r, 6);
    const band = Math.floor(y / 4);
    const joint = [3, 11, 6, 14][band];
    if (x === joint) return jit(dark, r, 6);
    return jit(base, r, 9);
  };
}

function cobbleTex(seed) {
  const sr = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < 9; i++) pts.push([sr() * 16, sr() * 16, 0.8 + sr() * 0.4]);
  return pixTex(16, 16, seed, (x, y, r) => {
    let d1 = 1e9, d2 = 1e9, best = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let ox = -16; ox <= 16; ox += 16) {
        for (let oy = -16; oy <= 16; oy += 16) {
          const d = Math.hypot(x + 0.5 - pts[i][0] - ox, y + 0.5 - pts[i][1] - oy);
          if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d;
        }
      }
    }
    if (d2 - d1 < 1.1) return jit([70, 70, 70], r, 6);
    const v = 120 * pts[best][2];
    return jit([v, v, v], r, 8);
  });
}

function darken(src, w, h, amount, sy) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, sy || 0, w, h, 0, 0, w, h);
  g.fillStyle = `rgba(0,0,0,${amount})`;
  g.fillRect(0, 0, w, h);
  return c;
}

function buildTextures() {
  // --- Bakke ---
  const grass = (x, y, r) => {
    const v = r();
    if (v < 0.1) return jit([112, 192, 86], r, 8);
    if (v < 0.18) return jit([74, 142, 58], r, 8);
    return jit([92, 170, 72], r, 9);
  };
  const sand = (x, y, r) => (r() < 0.1 ? jit([206, 190, 126], r, 8) : jit([228, 212, 148], r, 9));
  const water = (x, y, r) => {
    if ((x + y * 3) % 13 === 0 && r() < 0.7) return jit([105, 165, 238], r, 8);
    return jit([54, 118, 212], r, 7);
  };
  const dirt = (x, y, r) => (r() < 0.12 ? jit([105, 74, 45], r, 8) : jit([138, 100, 64], r, 12));
  const floor = plankFn([184, 140, 84], [120, 86, 48]);
  const gfns = [grass, sand, water, dirt, floor];
  for (let t = 0; t < gfns.length; t++) {
    Tex.ground[t] = [];
    for (let v = 0; v < 4; v++) Tex.ground[t].push(pixTex(16, 16, 100 + t * 10 + v, gfns[t]));
  }

  // --- Blokker (toppflate) ---
  const leaves = (x, y, r) => {
    const v = r();
    if (v < 0.22) return jit([30, 88, 28], r, 6);
    if (v < 0.36) return jit([72, 150, 56], r, 8);
    return jit([46, 120, 40], r, 8);
  };
  Tex.top[BLK.TREE] = pixTex(16, 16, 201, leaves);
  Tex.top[BLK.STONE] = pixTex(16, 16, 202, stoneFn);
  Tex.top[BLK.IRON] = oreTex(203, [222, 182, 150], [178, 132, 100]);
  Tex.top[BLK.DIAMOND] = oreTex(204, [110, 245, 240], [40, 190, 200]);
  Tex.top[BLK.PLANK] = pixTex(16, 16, 205, plankFn([196, 150, 90], [128, 92, 52]));
  Tex.top[BLK.COBBLE] = cobbleTex(206);
  Tex.top[BLK.METAL] = pixTex(16, 16, 207, (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [92, 98, 108];
    if ((x === 2 || x === 13) && (y === 2 || y === 13)) return [110, 116, 126];
    if (y === 1 || x === 1) return [214, 222, 230];
    return jit([178, 188, 198], r, 5);
  });
  Tex.top[BLK.CHEST] = pixTex(16, 16, 208, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [64, 40, 18];
    if (x >= 7 && x <= 8 && y >= 6 && y <= 9) return [240, 205, 70];
    if (y === 7 || y === 8) return [104, 66, 28];
    return [((x + y) % 5 === 0) ? 146 : 164, ((x + y) % 5 === 0) ? 94 : 106, 44];
  });
  Tex.top[BLK.BUSH] = pixTex(16, 16, 209, (x, y, r) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.2 + r() * 1.2) return null;
    const v = r();
    if (v < 0.2) return jit([44, 122, 40], r, 6);
    if (v < 0.32) return jit([110, 196, 84], r, 8);
    return jit([72, 160, 58], r, 8);
  });

  // --- Blokker (sideflate, den mørke "fronten") ---
  for (let b = 1; b < BLOCK_INFO.length; b++) Tex.side[b] = darken(Tex.top[b], 16, 5, 0.38, 11);
  Tex.side[BLK.TREE] = pixTex(16, 5, 301, (x, y, r) => {
    if (x >= 6 && x <= 9) return jit((x === 7) ? [92, 66, 38] : [112, 82, 48], r, 6);
    return jit([30, 84, 28], r, 6);
  });
  Tex.side[BLK.CHEST] = pixTex(16, 5, 302, (x, y) => {
    if (x === 0 || x === 15 || y === 4) return [50, 30, 12];
    if (x >= 7 && x <= 8 && y <= 2) return [220, 185, 60];
    return [120, 76, 32];
  });

  // --- Sprekker (Minecraft-"knuse"-animasjon) ---
  const cr = mulberry32(999);
  const crackPix = [];
  let cx = 8, cy = 8;
  for (let i = 0; i < 90; i++) {
    crackPix.push([cx, cy]);
    if (i % 18 === 0) { cx = 8; cy = 8; }
    cx = clamp(cx + Math.floor(cr() * 3) - 1, 0, 15);
    cy = clamp(cy + Math.floor(cr() * 3) - 1, 0, 15);
  }
  for (let s = 0; s < 5; s++) {
    const c = makeCanvas(16, 16);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.55)';
    const n = Math.floor(((s + 1) / 5) * crackPix.length);
    for (let i = 0; i < n; i++) g.fillRect(crackPix[i][0], crackPix[i][1], 1, 1);
    Tex.crack.push(c);
  }
}

// ------------------------------------------------------------
//  Ikoner til hotbar, pickups og knapper
// ------------------------------------------------------------
function drawIcon(g, name, x, y, s) {
  g.save();
  g.translate(x, y);
  g.imageSmoothingEnabled = false;
  const u = s / 16;
  const R = (px, py, pw, ph, col) => { g.fillStyle = col; g.fillRect(px * u, py * u, pw * u, ph * u); };
  switch (name) {
    case 'weapon': {
      // Diamantsverd
      for (let i = 0; i < 9; i++) R(5 + i, 10 - i, 2, 2, i < 1 ? '#2a8f8f' : '#6ff0e8');
      R(6, 9, 1, 1, '#ffffff');
      R(3, 9, 4, 2, '#5a3a1a'); R(4, 8, 2, 4, '#5a3a1a');
      R(1, 12, 3, 3, '#7a5230'); R(2, 13, 1, 1, '#3a2410');
      break;
    }
    case 'pickaxe': {
      for (let i = 0; i < 10; i++) R(3 + i, 12 - i, 2, 2, '#7a5230');
      R(5, 1, 6, 2, '#6ff0e8'); R(11, 3, 2, 6, '#6ff0e8'); R(3, 2, 2, 2, '#2a8f8f'); R(12, 9, 2, 2, '#2a8f8f');
      break;
    }
    case 'wood': g.drawImage(Tex.top[BLK.PLANK], 0, 0, s, s); break;
    case 'stone': g.drawImage(Tex.top[BLK.COBBLE], 0, 0, s, s); break;
    case 'iron': {
      R(2, 6, 12, 6, '#8c939b'); R(3, 5, 10, 6, '#d8dee4'); R(4, 6, 8, 1, '#ffffff'); R(3, 10, 10, 1, '#a9b0b8');
      break;
    }
    case 'diamond': {
      g.fillStyle = '#3be0ff';
      g.beginPath(); g.moveTo(8 * u, 1 * u); g.lineTo(15 * u, 7 * u); g.lineTo(8 * u, 15 * u); g.lineTo(1 * u, 7 * u); g.closePath(); g.fill();
      g.fillStyle = '#b8fbff';
      g.beginPath(); g.moveTo(8 * u, 2.5 * u); g.lineTo(11 * u, 7 * u); g.lineTo(8 * u, 7 * u); g.closePath(); g.fill();
      g.strokeStyle = '#137a8f'; g.lineWidth = u; g.stroke();
      break;
    }
    case 'bandage': {
      R(2, 4, 12, 8, '#f4efe6'); R(2, 4, 12, 1, '#ffffff'); R(2, 11, 12, 1, '#c9c2b5');
      R(7, 5, 2, 6, '#e23b3b'); R(5, 7, 6, 2, '#e23b3b');
      break;
    }
    case 'potion': {
      R(6, 1, 4, 2, '#8a5a2a'); R(6, 3, 4, 3, '#cfe8ff');
      R(3, 6, 10, 9, '#2f6ff0'); R(4, 7, 3, 3, '#8fc0ff'); R(3, 14, 10, 1, '#1d3f9a');
      break;
    }
    case 'tnt': {
      R(1, 2, 14, 12, '#d9342b'); R(1, 6, 14, 4, '#f2efe8');
      g.fillStyle = '#222'; g.font = `bold ${4.5 * u}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('TNT', 8 * u, 8.2 * u);
      R(7, 0, 2, 2, '#444');
      break;
    }
    case 'turret': {
      R(2, 8, 12, 7, '#7d848c'); R(3, 9, 10, 5, '#a3aab2');
      R(5, 4, 6, 5, '#555c64'); R(10, 5, 6, 2, '#33383d'); R(6, 5, 2, 2, '#ff4040');
      break;
    }
    case 'cube': {
      g.shadowColor = '#5dff6a'; g.shadowBlur = 6 * u;
      R(2, 2, 12, 12, '#1f9d3a'); g.shadowBlur = 0;
      R(3, 3, 10, 10, '#46d65c'); R(5, 5, 6, 6, '#a6ff9a'); R(3, 3, 10, 1, '#c8ffc0');
      break;
    }
    case 'wall': {
      g.drawImage(Tex.top[BLK.PLANK], 0, 2 * u, 5 * u, 12 * u);
      g.drawImage(Tex.top[BLK.PLANK], 5.5 * u, 2 * u, 5 * u, 12 * u);
      g.drawImage(Tex.top[BLK.PLANK], 11 * u, 2 * u, 5 * u, 12 * u);
      break;
    }
    case 'craft': {
      R(1, 1, 14, 14, '#8a5a2a'); R(2, 2, 12, 12, '#b98a50');
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R(3 + i * 4, 3 + j * 4, 3, 3, '#6b4420');
      break;
    }
  }
  g.restore();
}
