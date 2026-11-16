import * as THREE from 'three';

export const WOODS = {
  beech: { name: '山毛榉', detail: '细密 · 温润', base: '#d8b78c', dark: '#9e744d', roughness: 0.56 },
  maple: { name: '枫木', detail: '浅蜜 · 柔光', base: '#e4c9a1', dark: '#b58c5c', roughness: 0.5 },
  birch: { name: '白桦', detail: '冷白 · 细腻', base: '#eadfc7', dark: '#bca886', roughness: 0.6 },
  walnut: { name: '胡桃木', detail: '深褐 · 醇厚', base: '#765641', dark: '#3f2c22', roughness: 0.48 }
};

const FINISHES = {
  raw: { roughness: 1.08, clearcoat: 0, coatRoughness: 0.7 },
  wax: { roughness: 0.86, clearcoat: 0.16, coatRoughness: 0.4 },
  gloss: { roughness: 0.42, clearcoat: 0.85, coatRoughness: 0.12 }
};

export const FORMS = {
  cone: { name: '球 + 圆锥', short: '圆锥', hint: '经典棋子木坯，直壁收肩' },
  capsule: { name: '球 + 半胶囊', short: '胶囊', hint: '直壁加半球拱顶，圆润无颈' },
  kokeshi: { name: '日本娃娃', short: '和娃娃', hint: '喇叭身、圆肩，大发头压在肩上' },
  matryoshka: { name: '俄罗斯套娃', short: '套娃', hint: '蛋形收腰，头嵌进身体不见脖子' }
};

export const DEFAULT_PROFILE = {
  form: 'cone', height: 2.3, base: 0.78, foot: 0.055, belly: 0,
  shoulder: 0.3, dome: 0, head: 0.6, squash: 1, neck: 0, seat: 0.06
};

export const FORM_PRESETS = {
  cone: { ...DEFAULT_PROFILE },
  capsule: { ...DEFAULT_PROFILE, form: 'capsule', shoulder: 0.78, dome: 0.78 },
  kokeshi: {
    form: 'kokeshi', height: 2.3, base: 0.72, foot: 0.12, belly: 0.16,
    shoulder: 0.5, dome: 0.34, head: 0.72, squash: 0.82, neck: 0, seat: 0.3
  },
  matryoshka: {
    form: 'matryoshka', height: 2.15, base: 0.92, foot: 0.24, belly: 0.06,
    shoulder: 0.3, dome: 0.3, head: 0.62, squash: 0.95, neck: 0, seat: 0.3
  }
};

const PROFILE_LIMITS = {
  height: [1.4, 3.1], base: [0.45, 1.1], foot: [0.02, 0.24], belly: [-0.38, 0.5],
  shoulder: [0.06, 1.1], dome: [0, 1.2], head: [0.34, 1], squash: [0.6, 1.5],
  neck: [0, 0.22], seat: [0, 0.6]
};

export function clampProfile(params = {}) {
  const next = { ...DEFAULT_PROFILE, ...params };
  next.form = FORMS[next.form] ? next.form : 'cone';
  for (const [key, [min, max]] of Object.entries(PROFILE_LIMITS)) {
    const value = Number(next[key]);
    next[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : DEFAULT_PROFILE[key];
  }
  next.seat = Math.min(next.seat, next.head * next.squash * 0.95);
  return next;
}

export const SIZE_LIMITS = { min: 6, max: 60, default: 14 };

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function resample(points, count = 190) {
  const lengths = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += points[i].distanceTo(points[i - 1]);
    lengths.push(total);
  }
  const result = [points[0].clone()];
  let segment = 0;
  for (let i = 1; i < count - 1; i++) {
    const target = total * i / (count - 1);
    while (segment < lengths.length - 2 && lengths[segment + 1] < target) segment++;
    const length = lengths[segment + 1] - lengths[segment];
    const t = length ? (target - lengths[segment]) / length : 0;
    result.push(points[segment].clone().lerp(points[segment + 1], t));
  }
  result.push(points[points.length - 1].clone());
  return result;
}

export function readProfile(params = DEFAULT_PROFILE) {
  const p = clampProfile(params);
  const dome = Math.min(p.dome, p.height * 0.8);
  const sideH = Math.max(0.3, p.height - dome);
  const bodyTop = sideH + dome;
  const headV = p.head * p.squash;
  const neckRadius = Math.max(0.07, Math.min(0.3, Math.min(p.shoulder, p.head * 0.46)));
  const neckTop = bodyTop + p.neck;
  const headY = neckTop + headV - p.seat;
  const body = [];
  const v = (x, y) => body.push(new THREE.Vector2(Math.max(0.0001, x), y));

  v(0, 0);
  v(p.base * 0.9, 0);
  const edge = Math.min(p.foot, sideH * 0.3);
  for (let i = 1; i <= 10; i++) {
    const a = i / 10 * Math.PI / 2;
    v(p.base - edge * (1 - Math.sin(a)), edge * (1 - Math.cos(a)));
  }

  const ctrlX = (p.base + p.shoulder) / 2 + p.belly;
  const ctrlY = (edge + sideH) / 2;
  for (let i = 1; i <= 56; i++) {
    const t = i / 56;
    const u = 1 - t;
    v(u * u * p.base + 2 * u * t * ctrlX + t * t * p.shoulder, u * u * edge + 2 * u * t * ctrlY + t * t * sideH);
  }

  if (dome > 0.004) {
    for (let i = 1; i <= 26; i++) {
      const a = i / 26 * Math.PI / 2;
      v(p.shoulder * Math.cos(a), sideH + dome * Math.sin(a));
    }
  } else {
    v(0, sideH);
  }

  if (p.neck > 0.004) {
    v(neckRadius, bodyTop);
    v(neckRadius, neckTop);
  }

  const headR = y => {
    const t = (y - headY) / headV;
    return Math.abs(t) >= 1 ? 0 : p.head * Math.sqrt(1 - t * t);
  };
  let takeover = -1;
  for (let i = 1; i < body.length; i++) {
    if (body[i].y > headY - headV && headR(body[i].y) > body[i].x + 1e-4) {
      takeover = i;
      break;
    }
  }
  const points = takeover > 0 ? body.slice(0, takeover) : body;
  const junctionY = takeover > 0 ? body[takeover].y : headY + headV;
  if (takeover > 0) {
    for (let i = 0; i <= 64; i++) {
      const a = -Math.PI / 2 + i / 64 * Math.PI;
      const y = headY + headV * Math.sin(a);
      if (y < junctionY - 1e-6) continue;
      points.push(new THREE.Vector2(Math.max(0.0001, p.head * Math.cos(a)), y));
    }
  }

  return {
    points, params: p, sideH, dome, bodyTop, neckTop, headY, headV,
    headTop: takeover > 0 ? headY + headV : bodyTop,
    neckRadius, edge, ctrlX, ctrlY, junctionY, merged: takeover > 0
  };
}

export function buildProfile(params = DEFAULT_PROFILE) {
  return resample(readProfile(params).points, 200);
}

function computeMetrics(params) {
  const g = readProfile(params);
  return {
    bodyTop: g.bodyTop,
    waistY: g.sideH * 0.58,
    headY: g.headY,
    headRadius: g.params.head,
    headV: g.headV,
    headTop: g.headTop,
    baseRadius: g.params.base,
    neckRadius: g.neckRadius
  };
}

export class PegDoll {
  constructor() {
    this.group = new THREE.Group();
    this.woodKey = 'beech';
    this.shapeKey = 'cone';
    this.shapeParams = { ...FORM_PRESETS.cone };
    this.finishKey = 'wax';
    this.sizeCm = SIZE_LIMITS.default;
    this.scale = 1;
    this.worldHeight = 3.54;
    this.paintTexture = null;
    this.onChange = null;
    this.generateWood();
    this.metrics = computeMetrics(this.shapeParams);
    this.applyScale();
    this.profile = buildProfile(this.shapeParams);
    this.segments = 96;
    const geometry = new THREE.LatheGeometry(this.profile, this.segments, -Math.PI, Math.PI * 2);
    geometry.normalizeNormals();
    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: this.woodTexture,
      bumpMap: this.woodBumpTexture,
      bumpScale: 0.013,
      roughness: 0.44,
      metalness: 0,
      clearcoat: 0.28,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.65
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'paintable-doll';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
    this.applyFinish();
  }

  generateWood() {
    const size = 768;
    const canvas = document.createElement('canvas');
    const bump = document.createElement('canvas');
    canvas.width = canvas.height = bump.width = bump.height = size;
    const ctx = canvas.getContext('2d');
    const bctx = bump.getContext('2d');
    const image = ctx.createImageData(size, size);
    const bumpImage = bctx.createImageData(size, size);
    const wood = WOODS[this.woodKey];
    const base = hexToRgb(wood.base);
    const dark = hexToRgb(wood.dark);
    const random = seededRandom(217 + Object.keys(WOODS).indexOf(this.woodKey) * 71);

    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const warp = Math.sin(v * 8.2) * 1.3 + Math.sin(v * 23.7) * 0.22;
        const longGrain = Math.sin(u * 126 + warp) * 0.5 + 0.5;
        const fineGrain = Math.sin(u * 490 + Math.sin(v * 17) * 2.1) * 0.5 + 0.5;
        const broad = Math.sin(u * 31 + Math.sin(v * 4.3)) * 0.5 + 0.5;
        const pore = random() > 0.986 ? random() * 0.2 : 0;
        const mix = Math.max(0, Math.min(0.52, longGrain * 0.085 + fineGrain * 0.04 + broad * 0.05 + pore + (random() - 0.5) * 0.028));
        const index = (y * size + x) * 4;
        for (let c = 0; c < 3; c++) image.data[index + c] = base[c] * (1 - mix) + dark[c] * mix;
        image.data[index + 3] = 255;
        const bumpValue = 128 + (longGrain - 0.5) * 22 + (fineGrain - 0.5) * 11 + (random() - 0.5) * 8;
        bumpImage.data[index] = bumpImage.data[index + 1] = bumpImage.data[index + 2] = bumpValue;
        bumpImage.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    bctx.putImageData(bumpImage, 0, 0);

    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 46; i++) {
      const x = random() * size;
      ctx.strokeStyle = i % 3 ? wood.dark : '#fff4df';
      ctx.lineWidth = random() * 0.7 + 0.25;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.bezierCurveTo(x + random() * 24 - 12, size * 0.3, x + random() * 30 - 15, size * 0.65, x + random() * 18 - 9, size + 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.woodCanvas = canvas;
    this.woodBumpCanvas = bump;
    if (this.woodTexture) {
      this.woodTexture.dispose();
      this.woodBumpTexture.dispose();
    }
    this.woodTexture = new THREE.CanvasTexture(canvas);
    this.woodTexture.colorSpace = THREE.SRGBColorSpace;
    this.woodTexture.wrapS = THREE.RepeatWrapping;
    this.woodTexture.anisotropy = 8;
    this.woodBumpTexture = new THREE.CanvasTexture(bump);
    this.woodBumpTexture.wrapS = THREE.RepeatWrapping;
  }

  setPaintCanvas(canvas) {
    if (!this.paintTexture) {
      this.paintTexture = new THREE.CanvasTexture(canvas);
      this.paintTexture.colorSpace = THREE.SRGBColorSpace;
      this.paintTexture.wrapS = THREE.RepeatWrapping;
      this.paintTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.paintTexture.anisotropy = 8;
    } else {
      this.paintTexture.image = canvas;
    }
    this.material.map = this.paintTexture;
    this.material.needsUpdate = true;
    this.updateTexture();
  }

  setPhysCanvas(canvas) {
    if (!this.physTexture) {
      this.physTexture = new THREE.CanvasTexture(canvas);
      this.physTexture.wrapS = THREE.RepeatWrapping;
      this.physTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.physTexture.anisotropy = 4;
    } else {
      this.physTexture.image = canvas;
    }
    this.material.roughnessMap = this.physTexture;
    this.material.bumpMap = this.physTexture;
    this.material.needsUpdate = true;
    this.updatePhys();
  }

  updatePhys() {
    if (this.physTexture) this.physTexture.needsUpdate = true;
    this.onChange?.();
  }

  updateTexture() {
    if (this.paintTexture) this.paintTexture.needsUpdate = true;
    this.onChange?.();
  }

  setWood(key) {
    if (!WOODS[key]) return;
    this.woodKey = key;
    this.generateWood();
    if (!this.physTexture) this.material.bumpMap = this.woodBumpTexture;
    if (!this.paintTexture) this.material.map = this.woodTexture;
    this.applyFinish();
  }

  rebuildGeometry() {
    const geometry = new THREE.LatheGeometry(this.profile, this.segments, -Math.PI, Math.PI * 2);
    geometry.normalizeNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.onChange?.();
  }

  setTurnQuality(scale) {
    const next = Math.max(28, Math.round(96 * scale));
    if (next === this.segments) return;
    this.segments = next;
    this.rebuildGeometry();
  }

  setShape(key) {
    if (!FORMS[key] || key === this.shapeKey) return;
    this.shapeKey = key;
    this.shapeParams = clampProfile(FORM_PRESETS[key]);
    this.refreshProfile();
  }

  setShapeParams(patch = {}) {
    if (patch.form && patch.form !== this.shapeKey) { this.setShape(patch.form); return; }
    const next = { ...this.shapeParams, ...patch };
    if (this.shapeKey === 'capsule') {
      if ('base' in patch && !('shoulder' in patch)) next.shoulder = next.base;
      if (('base' in patch || 'shoulder' in patch) && !('dome' in patch)) next.dome = next.shoulder;
    }
    this.shapeParams = clampProfile(next);
    this.refreshProfile();
  }

  refreshProfile() {
    this.metrics = computeMetrics(this.shapeParams);
    this.profile = buildProfile(this.shapeParams);
    this.applyScale();
    this.rebuildGeometry();
  }

  setSize(cm) {
    const value = Number(cm);
    this.sizeCm = Math.max(SIZE_LIMITS.min, Math.min(SIZE_LIMITS.max, Number.isFinite(value) ? value : SIZE_LIMITS.default));
    this.applyScale();
    this.onChange?.();
  }

  applyScale() {
    const authored = this.metrics.headTop || 3.54;
    this.scale = this.sizeCm / (authored * 10);
    this.worldHeight = authored * this.scale;
    this.group.scale.setScalar(this.scale);
  }

  setFinish(key) {
    if (!FINISHES[key]) return;
    this.finishKey = key;
    this.applyFinish();
  }

  applyFinish() {
    if (!this.material) return;
    const finish = FINISHES[this.finishKey];
    const wood = WOODS[this.woodKey];
    this.material.roughness = Math.min(1, wood.roughness * finish.roughness);
    this.material.clearcoat = finish.clearcoat;
    this.material.clearcoatRoughness = finish.coatRoughness;
    this.material.bumpScale = this.finishKey === 'gloss' ? 0.006 : 0.013;
    this.material.needsUpdate = true;
    this.onChange?.();
  }

  yToV(y) {
    let best = 0;
    let distance = Infinity;
    for (let i = 0; i < this.profile.length; i++) {
      const d = Math.abs(this.profile[i].y - y);
      if (d < distance) { distance = d; best = i; }
    }
    return best / (this.profile.length - 1);
  }
}
