export const BRUSHES = {
  liner: { name: '极细勾线笔', label: '勾线笔 · 00 号', description: '睫毛、微笑与细致线稿', size: 6, opacity: 0.96, spacing: 0.2 },
  round: { name: '圆头笔', label: '圆头笔 · 4 号', description: '柔和铺色与花瓣', size: 14, opacity: 0.94, spacing: 0.22 },
  flat: { name: '平头刷', label: '平头刷 · 8 号', description: '均匀平涂与宽色带', size: 25, opacity: 0.96, spacing: 0.25 },
  wash: { name: '板刷', label: '板刷 · 羊毛排笔', description: '大面铺底与整块色带', size: 46, opacity: 0.9, spacing: 0.3 },
  blush: { name: '晕染刷', label: '晕染刷 · 羊毛', description: '腮红与柔和渐层', size: 30, opacity: 0.18, spacing: 0.28 }
};

export const PIGMENTS = [
  { name: '朱砂红', hex: '#B8493D' }, { name: '杏子橙', hex: '#D8814E' },
  { name: '芥末黄', hex: '#D2A83E' }, { name: '奶油白', hex: '#EEE4CD' },
  { name: '苔藓绿', hex: '#65764B' }, { name: '森林绿', hex: '#355749' },
  { name: '湖水蓝', hex: '#5E9696' }, { name: '群青蓝', hex: '#385A78' },
  { name: '烟粉', hex: '#D79A96' }, { name: '薰衣草', hex: '#8B7B99' },
  { name: '胡桃褐', hex: '#60483A' }, { name: '石墨黑', hex: '#303532' }
];

export const STAMPS = [
  { id: 'daisy', name: '雏菊', icon: 'flower-2' },
  { id: 'blossom', name: '五瓣花', icon: 'flower' },
  { id: 'leaf', name: '叶子', icon: 'leaf' },
  { id: 'star', name: '星星', icon: 'star' }
];

export const EYES = [
  { id: 'sleepy', name: '睡意' }, { id: 'round', name: '圆圆' },
  { id: 'happy', name: '笑眼' }, { id: 'bright', name: '亮眸' }
];

const PHYS_SIZE = 256;
const DRY_SECONDS = 34;

function rgba(hex, alpha) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function withAlpha(color, alpha) {
  if (color.startsWith('#')) return rgba(color, alpha);
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return color;
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
}

function hexRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return `rgb(${channels.map(c => Math.max(0, Math.min(255, Math.round(c + amount)))).join(',')})`;
}

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
}

export function resolveSymmetry(uv, mode, count = 4) {
  const { u, v } = uvPair(uv);
  if (mode === 'mirror') {
    return [{ u, v }, { u: (1 - u + 1) % 1, v }];
  }
  if (mode === 'radial') {
    return Array.from({ length: count }, (_, i) => ({ u: (u + i / count) % 1, v }));
  }
  return [{ u, v }];
}

function uvPair(uv) {
  return { u: uv.u ?? uv.x, v: uv.v ?? uv.y };
}

export class PaintSurface {
  constructor(doll, size = 1280) {
    this.doll = doll;
    this.width = this.height = size;
    this.canvas = document.createElement('canvas');
    this.paintCanvas = document.createElement('canvas');
    this.woodCanvas = document.createElement('canvas');
    [this.canvas, this.paintCanvas, this.woodCanvas].forEach(canvas => { canvas.width = canvas.height = size; });
    this.ctx = this.canvas.getContext('2d');
    this.paintCtx = this.paintCanvas.getContext('2d', { willReadFrequently: true });
    this.woodCtx = this.woodCanvas.getContext('2d');
    this.undoStack = [];
    this.redoStack = [];
    this.lastPoints = null;
    this.drawing = false;
    this.presetId = null;
    this.water = 0.4;
    this.brushAxis = 0;
    this.strokeOrigin = null;
    this.lineBackup = document.createElement('canvas');
    this.lineBackup.width = this.lineBackup.height = size;
    this.lineBackupCtx = this.lineBackup.getContext('2d');
    this.createPhysicalLayers();
    this.setWoodBase();
  }

  createPhysicalLayers() {
    this.grid = PHYS_SIZE;
    this.wet = new Float32Array(this.grid * this.grid);
    this.wetActive = false;
    this.wetClock = performance.now();
    this.physDirty = true;
    this.physCanvas = document.createElement('canvas');
    this.physCanvas.width = this.physCanvas.height = PHYS_SIZE;
    this.physCtx = this.physCanvas.getContext('2d', { willReadFrequently: true });
    this.physImage = this.physCtx.createImageData(PHYS_SIZE, PHYS_SIZE);
    this.coverCanvas = document.createElement('canvas');
    this.coverCanvas.width = this.coverCanvas.height = PHYS_SIZE;
    this.coverCtx = this.coverCanvas.getContext('2d', { willReadFrequently: true });
    this.woodBase = document.createElement('canvas');
    this.woodBase.width = this.woodBase.height = PHYS_SIZE;
    this.woodBaseSource = null;
  }

  setWoodBase() {
    this.woodCtx.clearRect(0, 0, this.width, this.height);
    this.woodCtx.drawImage(this.doll.woodCanvas, 0, 0, this.width, this.height);
    this.recomposite();
    this.physDirty = true;
  }

  recomposite() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.woodCanvas, 0, 0);
    this.ctx.drawImage(this.paintCanvas, 0, 0);
  }

  uvToPixel(uv) {
    const { u, v } = uvPair(uv);
    return { x: ((u % 1 + 1) % 1) * this.width, y: (1 - v) * this.height };
  }

  cellAt(x, y) {
    const scale = this.grid / this.width;
    const cx = Math.min(this.grid - 1, Math.max(0, Math.round(x * scale)));
    const cy = Math.min(this.grid - 1, Math.max(0, Math.round(y * scale)));
    return cy * this.grid + cx;
  }

  wetnessAt(x, y) {
    return this.wet[this.cellAt(x, y)] || 0;
  }

  depositWet(x, y, radius, amount) {
    if (amount <= 0.01) return;
    const scale = this.grid / this.width;
    const cx = x * scale;
    const cy = y * scale;
    const r = Math.max(1, radius * scale);
    const g = this.grid;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(g - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(g - 1, Math.ceil(cy + r));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const falloff = 1 - Math.hypot(px - cx, py - cy) / r;
        if (falloff <= 0) continue;
        const index = py * g + px;
        const value = amount * Math.min(1, falloff * 1.6);
        if (value > this.wet[index]) this.wet[index] = value;
      }
    }
    this.wetActive = true;
  }

  tickDrying(now = performance.now()) {
    const dt = (now - this.wetClock) / 1000;
    this.wetClock = now;
    if (!this.wetActive || dt <= 0) return false;
    const decay = Math.exp(-dt / DRY_SECONDS);
    let peak = 0;
    for (let i = 0; i < this.wet.length; i++) {
      const value = this.wet[i] * decay;
      this.wet[i] = value > 0.006 ? value : 0;
      if (this.wet[i] > peak) peak = this.wet[i];
    }
    this.wetActive = peak > 0.006;
    this.physDirty = true;
    return true;
  }

  drynessHint() {
    if (!this.wetActive) return 0;
    let peak = 0;
    for (let i = 0; i < this.wet.length; i += 7) if (this.wet[i] > peak) peak = this.wet[i];
    return peak;
  }

  refreshCover() {
    this.coverCtx.clearRect(0, 0, this.grid, this.grid);
    this.coverCtx.drawImage(this.paintCanvas, 0, 0, this.grid, this.grid);
    this.cover = this.coverCtx.getImageData(0, 0, this.grid, this.grid).data;
  }

  rebuildPhys() {
    if (!this.doll.woodBumpCanvas) return;
    if (this.woodBaseSource !== this.doll.woodBumpCanvas) {
      this.woodBaseSource = this.doll.woodBumpCanvas;
      const ctx = this.woodBase.getContext('2d');
      ctx.clearRect(0, 0, this.grid, this.grid);
      ctx.drawImage(this.doll.woodBumpCanvas, 0, 0, this.grid, this.grid);
    }
    if (!this.cover) this.refreshCover();
    const wood = this.woodBase.getContext('2d').getImageData(0, 0, this.grid, this.grid).data;
    const cover = this.cover;
    const out = this.physImage.data;
    for (let i = 0; i < this.grid * this.grid; i++) {
      const index = i * 4;
      const film = (cover[index + 3] || 0) / 255;
      const wet = film > 0.02 ? this.wet[i] : 0;
      const grain = wood[index] || 128;
      const height = grain * (1 - film) + film * (142 + Math.min(1, film * 1.25) * 82);
      const gloss = film * (0.26 + 0.46 * wet - 0.1 * Math.min(1, film * 1.2));
      out[index] = Math.max(0, Math.min(255, height));
      out[index + 1] = Math.max(48, 255 * (1 - gloss));
      out[index + 2] = 255;
      out[index + 3] = 255;
    }
    this.physCtx.putImageData(this.physImage, 0, 0);
    this.physDirty = false;
    this.doll.updatePhys?.();
  }

  flushPhys(force = false) {
    if (!this.physDirty && !force) return;
    this.refreshCover();
    this.rebuildPhys();
  }

  beginStroke(points, config) {
    this.presetId = null;
    this.drawing = true;
    this.lastPoints = points.map(point => this.uvToPixel(point));
    if (config.mode === 'lathe') {
      this.drawLathe(uvPair(points[0]).v, config);
      return;
    }
    this.lastPoints.forEach(point => this.renderBrush(point.x, point.y, config, 0));
  }

  continueStroke(points, config) {
    if (!this.drawing || !this.lastPoints) return this.beginStroke(points, config);
    if (config.mode === 'lathe') {
      this.drawLathe(uvPair(points[0]).v, config);
      return;
    }
    const current = points.map(point => this.uvToPixel(point));
    current.forEach((point, index) => {
      const last = this.lastPoints[index];
      if (!last) return;
      if (Math.abs(point.x - last.x) > this.width * 0.5) {
        const direction = point.x > last.x ? -1 : 1;
        this.interpolate(last.x, last.y, point.x + direction * this.width, point.y, config);
        this.interpolate(last.x - direction * this.width, last.y, point.x, point.y, config);
      } else {
        this.interpolate(last.x, last.y, point.x, point.y, config);
      }
    });
    this.lastPoints = current;
  }

  endStroke() {
    if (!this.drawing) return false;
    this.drawing = false;
    this.lastPoints = null;
    this.saveState();
    return true;
  }

  interpolate(x0, y0, x1, y1, config) {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const brush = BRUSHES[config.brush] || BRUSHES.round;
    const step = Math.max(1.2, config.size * brush.spacing * (1 - (config.load ?? 1) * 0.22));
    const count = Math.max(1, Math.ceil(distance / step));
    const angle = Math.atan2(y1 - y0, x1 - x0);
    if (config.brush === 'flat' || config.brush === 'wash') {
      let diff = angle - this.brushAxis;
      while (diff > Math.PI / 2) diff -= Math.PI;
      while (diff < -Math.PI / 2) diff += Math.PI;
      this.brushAxis += diff * (config.brush === 'wash' ? 0.1 : 0.16);
    }
    const stroke = distance > 0.6 ? { ...config, speed: distance / count } : config;
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      this.renderBrush(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, stroke, angle);
    }
  }

  onPaintLayers(callback) {
    callback(this.paintCtx, false);
    callback(this.ctx, true);
  }

  blendWithCover(x, y, color, amount) {
    if (!this.cover || amount <= 0.02) return color;
    const scale = this.grid / this.width;
    const cx = Math.max(0, Math.min(this.grid - 1, Math.round(x * scale)));
    const cy = Math.max(0, Math.min(this.grid - 1, Math.round(y * scale)));
    const index = (cy * this.grid + cx) * 4;
    const under = this.cover[index + 3] / 255;
    if (under < 0.08) return color;
    const mix = Math.min(0.78, amount * under);
    const source = hexRgb(color.startsWith('#') ? color : '#ffffff');
    if (!color.startsWith('#')) {
      const parsed = color.match(/[\d.]+/g);
      if (parsed) source.splice(0, 3, Number(parsed[0]), Number(parsed[1]), Number(parsed[2]));
    }
    const out = [0, 1, 2].map(c => Math.round(source[c] * (1 - mix) + this.cover[index + c] * mix));
    return `rgb(${out.join(',')})`;
  }

  brushFootprint(config, angle, water, load, wet) {
    const size = config.size;
    const splay = 0.66 + load * 0.52;
    const stretch = Math.min(0.5, (config.speed ?? 0) * 0.055);
    const bleed = 1 + wet * water * 0.55;
    if (config.brush === 'flat') {
      const across = Math.abs(Math.sin(angle - this.brushAxis));
      return {
        axis: this.brushAxis,
        rx: size * (0.14 + 0.5 * across) * splay * bleed,
        ry: size * 0.2 * splay,
        streaks: water < 0.52 && across > 0.35
      };
    }
    if (config.brush === 'wash') {
      const across = Math.abs(Math.sin(angle - this.brushAxis));
      return {
        axis: this.brushAxis,
        rx: size * (0.18 + 0.6 * across) * splay * bleed,
        ry: size * 0.26 * splay * bleed,
        streaks: water < 0.62 && across > 0.22
      };
    }
    if (config.brush === 'liner') {
      const core = Math.max(1.15, size * 0.3 * (0.42 + load * 0.72));
      return { axis: angle, rx: core * (1 + stretch), ry: core };
    }
    if (config.brush === 'blush') {
      const core = size * (0.85 + water * 0.5) * splay;
      return { axis: angle, rx: core * (1 + stretch * 0.5), ry: core, soft: true };
    }
    const core = size * 0.5 * splay * bleed;
    return { axis: angle, rx: core * (1 + stretch), ry: core * (1 - stretch * 0.5) };
  }

  renderBrush(x, y, config, angle = 0) {
    if (config.tool === 'eraser') {
      this.eraseAt(x, y, config.size * 0.65);
      return;
    }
    const brush = BRUSHES[config.brush] || BRUSHES.round;
    const water = Math.max(0, Math.min(1, config.water ?? 0.4));
    const load = Math.max(0.12, Math.min(1.35, config.load ?? 1));
    const wet = this.wetnessAt(x, y);
    const color = this.blendWithCover(x, y, config.color, wet * water * 0.82);
    const footprint = this.brushFootprint(config, angle, water, load, wet);
    const opacity = Math.max(0.02, brush.opacity * (1 - water * 0.58) * (0.5 + load * 0.62));
    const draw = (ctx, composite) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      if (footprint.soft) {
        const radius = Math.max(footprint.rx, footprint.ry);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, withAlpha(color, 0.8));
        gradient.addColorStop(0.45, withAlpha(color, 0.4));
        gradient.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(x, y);
        ctx.rotate(footprint.axis);
        ctx.beginPath();
        ctx.ellipse(0, 0, footprint.rx, footprint.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (footprint.streaks) {
          ctx.globalAlpha = opacity * 0.4;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(0.6, footprint.ry * 0.16);
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * footprint.ry * 0.55, -footprint.rx * 0.92);
            ctx.lineTo(i * footprint.ry * 0.55, footprint.rx * 0.92);
            ctx.stroke();
          }
        }
        if (config.brush === 'round' && water > 0.62) {
          ctx.globalAlpha = opacity * 0.22;
          ctx.strokeStyle = withAlpha(color, 0.9);
          ctx.lineWidth = Math.max(0.7, footprint.rx * 0.1);
          ctx.beginPath();
          ctx.arc(0, 0, footprint.rx * 0.96, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    };
    this.onPaintLayers(draw);
    const margin = Math.max(footprint.rx, footprint.ry) * 2.2;
    if (x < margin) this.onPaintLayers((ctx, composite) => {
      ctx.save(); ctx.translate(this.width, 0); draw(ctx, composite); ctx.restore();
    });
    if (x > this.width - margin) this.onPaintLayers((ctx, composite) => {
      ctx.save(); ctx.translate(-this.width, 0); draw(ctx, composite); ctx.restore();
    });
    this.depositWet(x, y, margin * 0.8, water * (0.55 + load * 0.45));
    this.physDirty = true;
  }

  eraseAt(x, y, radius) {
    const erase = ctx => {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    erase(this.paintCtx);
    erase(this.ctx);
    this.recomposite();
    this.wet[this.cellAt(x, y)] = 0;
    this.physDirty = true;
  }

  beginPreview() {
    this.lineBackupCtx.clearRect(0, 0, this.width, this.height);
    this.lineBackupCtx.drawImage(this.paintCanvas, 0, 0);
    this.previewing = true;
    this.presetId = null;
  }

  drawPreviewLine(from, to, config) {
    if (!this.previewing) this.beginPreview();
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.paintCtx.drawImage(this.lineBackup, 0, 0);
    this.recomposite();
    this.strokeSegment(from, to, config);
    this.flushPhys(true);
  }

  commitPreview(commit) {
    if (!this.previewing) return false;
    this.previewing = false;
    if (!commit) {
      this.paintCtx.clearRect(0, 0, this.width, this.height);
      this.paintCtx.drawImage(this.lineBackup, 0, 0);
      this.recomposite();
    }
    this.saveState();
    this.flushPhys(true);
    return true;
  }

  strokeSegment(from, to, config) {
    const points = config.mode === 'free'
      ? [[from, to]]
      : resolveSymmetry(from, config.mode, config.count).map((start, index) => {
        const ends = resolveSymmetry(to, config.mode, config.count);
        return [start, ends[index] || ends[0]];
      });
    points.forEach(([start, end]) => {
      const a = this.uvToPixel(start);
      const b = this.uvToPixel(end);
      let dx = b.x - a.x;
      if (Math.abs(dx) > this.width * 0.5) dx -= Math.sign(dx) * this.width;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const step = Math.max(1.2, config.size * (BRUSHES[config.brush] || BRUSHES.round).spacing * 0.7);
      const count = Math.max(1, Math.ceil(distance / step));
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = ((a.x + dx * t) % this.width + this.width) % this.width;
        this.renderBrush(x, a.y + dy * t, { ...config, speed: 0 }, angle);
      }
    });
  }

  drawLathe(v, config) {
    const y = (1 - v) * this.height;
    const height = config.size * 1.15;
    if (config.tool === 'eraser') {
      this.paintCtx.save();
      this.paintCtx.globalCompositeOperation = 'destination-out';
      this.paintCtx.fillRect(0, y - height / 2, this.width, height);
      this.paintCtx.restore();
      this.recomposite();
      this.physDirty = true;
      return;
    }
    const water = Math.max(0, Math.min(1, config.water ?? 0.4));
    this.onPaintLayers(ctx => {
      ctx.save();
      ctx.globalAlpha = Math.max(0.02, (BRUSHES[config.brush] || BRUSHES.round).opacity * (1 - water * 0.55));
      ctx.fillStyle = config.color;
      ctx.fillRect(0, y - height / 2, this.width, height);
      ctx.restore();
    });
    for (let x = 0; x < this.width; x += this.width / 64) this.depositWet(x, y, height, water);
    this.physDirty = true;
  }

  stampAt(points, config) {
    this.presetId = null;
    points.forEach(uv => {
      const point = this.uvToPixel(uv);
      const decal = config.tool === 'sticker'
        ? this.createEyeDecal(config.eye, config.color)
        : this.createStampDecal(config.stamp, config.color);
      const size = config.tool === 'sticker' ? config.size * 2.25 : config.size * 3.1;
      if (config.tool === 'sticker') {
        this.onPaintLayers(ctx => {
          const half = size * 0.5;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(point.x - half, point.y - half, half * 2, half * 2, half * .42);
          ctx.fillStyle = 'rgba(250,246,236,.22)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(253,249,240,.5)';
          ctx.lineWidth = Math.max(2, size * .02);
          ctx.stroke();
          ctx.clip();
          ctx.strokeStyle = 'rgba(255,255,255,.72)';
          ctx.lineWidth = Math.max(2, size * .028);
          ctx.beginPath();
          ctx.moveTo(point.x - half * .5, point.y - half + ctx.lineWidth * .8);
          ctx.lineTo(point.x + half * .4, point.y - half + ctx.lineWidth * .8);
          ctx.stroke();
          ctx.restore();
        });
      }
      this.onPaintLayers(ctx => {
        ctx.save();
        ctx.globalAlpha = config.tool === 'stamp' ? Math.max(0.25, 0.9 - (config.water ?? 0.4) * 0.45) : 1;
        ctx.drawImage(decal, point.x - size / 2, point.y - size / 2, size, size);
        ctx.restore();
      });
      this.depositWet(point.x, point.y, size * 0.6, config.tool === 'sticker' ? 0.85 : Math.max(0.2, config.water ?? 0.4));
    });
    this.physDirty = true;
    this.saveState();
  }

  createStampDecal(type, color) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.translate(96, 96);
    ctx.fillStyle = color;
    if (type === 'daisy' || type === 'blossom') {
      const petals = type === 'daisy' ? 9 : 5;
      for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate(i / petals * Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(0, type === 'daisy' ? -40 : -32, type === 'daisy' ? 14 : 25, type === 'daisy' ? 35 : 31, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = shade(color, -38);
      ctx.beginPath(); ctx.arc(0, 0, type === 'daisy' ? 20 : 15, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'leaf') {
      ctx.beginPath();
      ctx.moveTo(0, 72);
      ctx.bezierCurveTo(-76, 28, -62, -48, 15, -72);
      ctx.bezierCurveTo(66, -24, 58, 45, 0, 72);
      ctx.fill();
      ctx.strokeStyle = shade(color, -45);
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-4, 62); ctx.quadraticCurveTo(10, 0, 15, -62); ctx.stroke();
    } else {
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 ? 31 : 72;
        points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
      polygon(ctx, points); ctx.fill();
    }
    ctx.globalCompositeOperation = 'destination-out';
    let seed = 37;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = random() * 0.42;
      ctx.beginPath();
      ctx.arc((random() - 0.5) * 150, (random() - 0.5) * 150, random() * 1.7 + 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }

  createEyeDecal(type, color) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.translate(80, 80);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    if (type === 'sleepy') {
      ctx.beginPath(); ctx.arc(0, -7, 35, 0.15, Math.PI - 0.15); ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 30, 4); ctx.lineTo(side * 41, 12); ctx.stroke();
      }
    } else if (type === 'happy') {
      ctx.beginPath(); ctx.arc(0, 10, 35, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, 28, 34, 0, 0, Math.PI * 2); ctx.fill();
      if (type === 'bright') {
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(-9, -11, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(9, 10, 3.5, 0, Math.PI * 2); ctx.fill();
      } else {
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(side * 22, -22); ctx.lineTo(side * 32, -32); ctx.stroke();
        }
      }
    }
    return canvas;
  }

  applyPreset(id) {
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.presetId = id === 'blank' ? null : id;
    if (id !== 'blank') this.renderFolkPreset(id);
    this.dryOff();
    this.recomposite();
    this.resetHistory();
  }

  dryOff() {
    this.wet.fill(0);
    this.wetActive = false;
    this.cover = null;
  }

  refreshPreset() {
    if (!this.presetId) return false;
    this.applyPreset(this.presetId);
    return true;
  }

  renderFolkPreset(id) {
    const ctx = this.paintCtx;
    const W = this.width;
    const H = this.height;
    const py = y => (1 - this.doll.yToV(y)) * H;
    const metrics = this.doll.metrics || {};
    const headY = metrics.headY ?? 2.84;
    const headScale = (metrics.headRadius ?? .6) / .6;
    const vs = (metrics.headV ?? metrics.headRadius ?? .6) / .6;
    const bodyTop = metrics.bodyTop ?? 2.3;
    const waistY = metrics.waistY ?? bodyTop * .58;
    const band = (y0, y1, color, u0 = 0, u1 = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(u0 * W, py(y1), (u1 - u0) * W, py(y0) - py(y1));
    };
    const line = (u0, y0, u1, y1, color, width) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(u0 * W, py(y0)); ctx.lineTo(u1 * W, py(y1)); ctx.stroke();
    };
    const decal = (type, u, y, size, color, eye = false) => {
      const canvas = eye ? this.createEyeDecal(type, color) : this.createStampDecal(type, color);
      ctx.drawImage(canvas, u * W - size / 2, py(y) - size / 2, size, size);
    };
    const forest = id === 'forest';
    const cloth = forest ? '#526B4B' : '#AA493D';
    const bodice = forest ? '#E3D5B5' : '#303733';
    const dressTop = waistY;
    const bodiceTop = bodyTop - .005;
    band(0.025, dressTop, cloth);
    band(0.035, 0.095, shade(cloth, -24));
    band(dressTop, bodiceTop, bodice);
    band(bodyTop - .08, bodyTop + .015, '#F0E5CF');

    const apronTop = waistY - .05;
    const apronHem = .14;
    const apronL = .402;
    const apronR = .598;
    const hemL = .348;
    const hemR = .652;
    const apronColor = forest ? '#D8C79F' : '#EFE3CB';
    const apronShade = forest ? '#B9A678' : '#D5C29E';
    const tieColor = forest ? '#A08D62' : '#C9B58E';

    ctx.strokeStyle = tieColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (const [u0, u1] of [[apronL, apronL - .078], [apronR, apronR + .078]]) {
      ctx.beginPath();
      ctx.moveTo(u0 * W, py(apronTop + .06));
      ctx.quadraticCurveTo((u0 + u1) / 2 * W, py(apronTop + .03), u1 * W, py(apronTop + .1));
      ctx.stroke();
    }

    const apronPath = () => {
      ctx.beginPath();
      ctx.moveTo(apronL * W, py(apronTop));
      ctx.quadraticCurveTo(.5 * W, py(apronTop - .025), apronR * W, py(apronTop));
      ctx.lineTo(hemR * W, py(apronHem));
      ctx.quadraticCurveTo(.5 * W, py(apronHem - .04), hemL * W, py(apronHem));
      ctx.closePath();
    };
    ctx.save();
    ctx.save();
    ctx.shadowColor = 'rgba(80,48,30,.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    apronPath();
    ctx.fillStyle = apronColor;
    ctx.fill();
    ctx.restore();
    apronPath();
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      const u = .418 + i * .03;
      line(u, apronTop - .02, u + (u - .5) * .34, apronHem - .01, apronShade, 3.4);
    }
    for (let i = 0; i < 12; i++) {
      const u = .378 + i * .021;
      line(u, apronHem - .005, u + (.5 - u) * .16, apronTop + .01, i % 2 ? '#C05A3E' : '#D3A03C', 3.6);
    }
    const hemTop = apronHem + .052;
    ctx.fillStyle = apronShade;
    ctx.fillRect(0, py(hemTop), W, py(apronHem) - py(hemTop));
    ctx.fillStyle = 'rgba(120,92,60,.09)';
    ctx.fillRect(apronL * W, 0, 34, H);
    ctx.fillRect(apronR * W - 34, 0, 34, H);
    ctx.strokeStyle = 'rgba(255,250,238,.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(0, py(hemTop) + 3);
    ctx.lineTo(W, py(hemTop) + 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = 'rgba(112,88,57,.22)';
    ctx.lineWidth = 2.4;
    apronPath();
    ctx.stroke();

    const pocketTop = apronTop - .15;
    ctx.beginPath();
    ctx.roundRect(.452 * W, py(pocketTop), .096 * W, py(pocketTop - .17) - py(pocketTop), 12);
    ctx.fillStyle = apronColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(112,88,57,.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,238,.55)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(.457 * W, py(pocketTop) + 3);
    ctx.lineTo(.543 * W, py(pocketTop) + 3);
    ctx.stroke();
    ctx.setLineDash([]);
    decal('daisy', .50, pocketTop - .085, 30, forest ? '#8A5E3B' : '#B8493D');
    decal('leaf', .523, pocketTop - .108, 20, '#718059');

    const bandTop = apronTop + .078;
    ctx.fillStyle = forest ? '#C3A46B' : '#DDB97A';
    ctx.fillRect(apronL * W - 8, py(bandTop), (apronR - apronL) * W + 16, py(apronTop) - py(bandTop));
    ctx.fillStyle = 'rgba(96,68,40,.16)';
    ctx.fillRect(apronL * W - 8, py(apronTop) + 1, (apronR - apronL) * W + 16, 7);
    ctx.strokeStyle = 'rgba(255,250,238,.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(apronL * W - 4, py(bandTop) + 4);
    ctx.lineTo(apronR * W + 4, py(bandTop) + 4);
    ctx.stroke();

    const ribbon = forest ? '#9F7C44' : '#C89A55';
    const ribbonLight = forest ? '#D3B681' : '#EBC98F';
    ctx.fillStyle = 'rgba(70,44,25,.18)';
    ctx.beginPath(); ctx.ellipse(.479 * W, py(apronTop + .025), 26, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ribbon;
    ctx.beginPath(); ctx.ellipse(.454 * W, py(apronTop + .035), 24, 14, -.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(.504 * W, py(apronTop + .042), 21, 12, .32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ribbonLight;
    ctx.beginPath(); ctx.ellipse(.458 * W, py(apronTop + .05), 14, 7, -.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(.5 * W, py(apronTop + .056), 12, 6, .32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = forest ? '#8F6E3B' : '#B58A4A';
    ctx.beginPath(); ctx.arc(.479 * W, py(apronTop + .038), 8, 0, Math.PI * 2); ctx.fill();
    line(.476, apronTop + .025, .449, apronTop - .17, ribbon, 7);
    line(.484, apronTop + .025, .512, apronTop - .14, ribbonLight, 6);

    if (!forest) {
      const bodiceHeight = bodiceTop - waistY;
      for (let i = 0; i < 4; i++) {
        const y = waistY + bodiceHeight * (0.13 + i * 0.19);
        line(0.443, y, 0.557, y + bodiceHeight * 0.1, '#EDE3CE', 5.5);
        line(0.557, y, 0.443, y + bodiceHeight * 0.1, '#EDE3CE', 5.5);
      }
      decal('blossom', 0.567, waistY + bodiceHeight * .5, 43, '#D9AE51');
      decal('leaf', 0.528, waistY + bodiceHeight * .47, 34, '#718059');
    } else {
      decal('leaf', 0.50, waistY + .25, 72, '#6C7B4F');
      decal('daisy', 0.54, waistY + .39, 38, '#EEE1C4');
    }

    const hair = forest ? '#6E5138' : '#5C4232';
    const hairDeep = forest ? '#57402D' : '#463126';
    band(headY - 0.52 * vs, headY + 0.7 * vs, hair);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(0.322 * W, py(headY - 0.56 * vs));
    ctx.lineTo(0.339 * W, py(headY + 0.10 * vs));
    ctx.quadraticCurveTo(0.354 * W, py(headY + 0.27 * vs), 0.426 * W, py(headY + 0.315 * vs));
    ctx.quadraticCurveTo(0.472 * W, py(headY + 0.325 * vs), 0.523 * W, py(headY + 0.255 * vs));
    ctx.quadraticCurveTo(0.596 * W, py(headY + 0.155 * vs), 0.662 * W, py(headY + 0.125 * vs));
    ctx.lineTo(0.678 * W, py(headY - 0.56 * vs));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(70,48,33,.13)';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(.43 * W, py(headY + .30 * vs));
    ctx.quadraticCurveTo(.5 * W, py(headY + .275 * vs), .55 * W, py(headY + .215 * vs));
    ctx.quadraticCurveTo(.61 * W, py(headY + .15 * vs), .658 * W, py(headY + .13 * vs));
    ctx.stroke();

    const lock = (u0, y0, u1, y1, bend, width, color = hair) => {
      for (const [scale, trim] of [[1, 0], [.58, .2], [.28, .38]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width * scale;
        ctx.lineCap = 'round';
        const sx = u0 + (u1 - u0) * trim;
        const sy = y0 + (y1 - y0) * trim;
        const ex = u1 - (u1 - u0) * trim;
        const ey = y1 - (y1 - y0) * trim;
        ctx.beginPath();
        ctx.moveTo(sx * W, py(sy));
        ctx.quadraticCurveTo(((u0 + u1) / 2 + bend) * W, py((y0 + y1) / 2), ex * W, py(ey));
        ctx.stroke();
      }
    };
    lock(.430, headY + .315 * vs, .612, headY + .105 * vs, .02, 26);
    lock(.446, headY + .308 * vs, .565, headY + .075 * vs, .012, 20, hairDeep);
    lock(.466, headY + .292 * vs, .532, headY + .09 * vs, .008, 15);
    lock(.415, headY + .30 * vs, .452, headY + .17 * vs, -.006, 13, hairDeep);
    lock(.337, headY + .18 * vs, .352, headY - .32 * vs, .004, 15, hairDeep);
    lock(.663, headY + .16 * vs, .648, headY - .32 * vs, -.004, 15, hairDeep);
    line(.345, headY + .14 * vs, .378, headY + .45 * vs, 'rgba(240,222,190,.2)', 3);
    line(.655, headY + .13 * vs, .628, headY + .43 * vs, 'rgba(240,222,190,.15)', 2.4);
    line(.452, headY + .31 * vs, .56, headY + .19 * vs, 'rgba(240,222,190,.16)', 2.2);

    decal('sleepy', 0.5 - .038 * headScale, headY - 0.02 * vs, 40 * headScale, '#3A332D', true);
    decal('sleepy', 0.5 + .038 * headScale, headY - 0.02 * vs, 40 * headScale, '#3A332D', true);
    for (const u of [0.5 - .058 * headScale, 0.5 + .058 * headScale]) {
      const x = u * W, y = py(headY - 0.16 * vs);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30 * headScale);
      gradient.addColorStop(0, 'rgba(202,111,93,.24)'); gradient.addColorStop(1, 'rgba(202,111,93,0)');
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, 30 * headScale, 0, Math.PI * 2); ctx.fill();
    }
    const crown = [
      [.398, .312, 43], [.437, .343, 50], [.478, .35, 52], [.518, .334, 49], [.553, .302, 43]
    ];
    crown.forEach(([u, y, size], index) => {
      decal('leaf', u + .014, headY + (y + .022) * vs, size * .8 * headScale, '#6D8057');
      decal('daisy', u, headY + y * vs, size * headScale, index % 2 ? '#EEE5CE' : '#F1E8D2');
    });
    decal('blossom', .43, headY + .27 * vs, 30 * headScale, '#D9AE51');
    decal('leaf', .407, headY + .29 * vs, 25 * headScale, '#718059');
  }

  clear() {
    this.presetId = null;
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.recomposite();
    this.saveState();
  }

  saveState() {
    this.undoStack.push(this.paintCtx.getImageData(0, 0, this.width, this.height));
    if (this.undoStack.length > 12) this.undoStack.shift();
    this.redoStack = [];
    this.flushPhys(true);
  }

  resetHistory() {
    this.undoStack = [];
    this.redoStack = [];
    this.saveState();
  }

  undo() {
    if (this.undoStack.length <= 1) return false;
    this.redoStack.push(this.undoStack.pop());
    this.paintCtx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
    this.recomposite();
    this.flushPhys(true);
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    const state = this.redoStack.pop();
    this.undoStack.push(state);
    this.paintCtx.putImageData(state, 0, 0);
    this.recomposite();
    this.flushPhys(true);
    return true;
  }

  async serialize() {
    return this.paintCanvas.toDataURL('image/png');
  }

  async restore(dataUrl) {
    this.presetId = null;
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = dataUrl; });
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.paintCtx.drawImage(image, 0, 0, this.width, this.height);
    this.dryOff();
    this.recomposite();
    this.resetHistory();
  }
}
