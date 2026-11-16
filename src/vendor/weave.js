import { axisIndices, modulo, fraction, gridPoint, blockRole, validateBlock } from './grid.js';

export const PALETTES = [
  { name: '燕麦与靛蓝', colors: ['#ece3d2', '#405b69', '#b8684d', '#d6b789', '#6f7862', '#f6f1e6', '#2a3f4a', '#a9533c'] },
  { name: '森林来信', colors: ['#e1dfcb', '#3f5546', '#8d9a75', '#d2ac72', '#744f40', '#f4f0df', '#22352a', '#b3814c'] },
  { name: '莓果奶油', colors: ['#f2e2d5', '#9b4b5c', '#c79494', '#65566d', '#d9b780', '#fbf3ea', '#71303e', '#8d7899'] },
  { name: '海边假日', colors: ['#e6e8dd', '#446c88', '#91b4bc', '#d99469', '#4b5b6e', '#f6f4ea', '#21465f', '#c4764f'] },
  { name: '黑白日常', colors: ['#e8e5df', '#393c3b', '#828580', '#b4b2a9', '#6b6863', '#fbfaf7', '#141414', '#d4d0c6'] },
  { name: '陶土与松石', colors: ['#efe4d6', '#a8553e', '#2f8078', '#d9a15b', '#523f38', '#f8f1e5', '#1f5f59', '#c27f42'] },
  { name: '暮紫与铜', colors: ['#ece3ea', '#5c4368', '#b07b4a', '#9483a6', '#3a2f3d', '#f7eef4', '#2f2338', '#caa06a'] },
  { name: '靛蓝与茜草', colors: ['#e9e3d6', '#203a5c', '#a8342f', '#d8b06a', '#476b62', '#f7f2e7', '#132437', '#7a2525'] },
];
const stripes = (colors, widths) => widths.map((width, index) => ({ color: colors[index % colors.length], width }));
export const PRESETS = [
  { name: '秋日野餐', subtitle: 'AUTUMN PICNIC', palette: 0, widths: [36, 4, 12, 4, 24, 4], indices: [0, 2, 1, 0, 1, 2], weave: 'twill', mirror: true },
  { name: '苔藓漫步', subtitle: 'MOSS WALK', palette: 1, widths: [28, 6, 16, 4, 10], indices: [1, 0, 2, 3, 0], weave: 'twill', mirror: true },
  { name: '莓果午后', subtitle: 'BERRY AFTERNOON', palette: 2, widths: [24, 24], indices: [0, 1], weave: 'plain', mirror: false },
  { name: '海盐蓝', subtitle: 'SEA SALT', palette: 3, widths: [30, 6, 18, 4, 10], indices: [0, 1, 2, 3, 0], weave: 'twill', mirror: true },
  { name: '经典千鸟', subtitle: 'HOUNDSTOOTH', palette: 4, widths: [8, 8], indices: [0, 1], weave: 'twill', mirror: false },
  { name: '暖杏窗格', subtitle: 'APRICOT WINDOW', palette: 0, widths: [48, 3, 6, 3], indices: [0, 2, 3, 2], weave: 'plain', mirror: false },
];
export function fromPreset(index) {
  const p = PRESETS[index];
  const colors = p.indices.map(i => PALETTES[p.palette].colors[i]);
  return { version: 1, name: p.name, warp: stripes(colors, p.widths), weft: stripes(colors, p.widths), linked: true, mirror: p.mirror, weave: p.weave, texture: 0.42, scale: 1, palette: p.palette };
}
export function expandedBands(bands, mirror) {
  return axisIndices(bands.length, mirror).map(index => bands[index]);
}
export function threadCount(bands, mirror) {
  return expandedBands(bands, mirror).reduce((sum, band) => sum + band.width, 0);
}
export const WEAVE_PERIOD = { plain: 2, twill: 4, basket: 4 };
/** True when the warp thread passes over the weft at this crossing. */
export function warpFaceUp(weave, warpIndex, weftIndex) {
  if (weave === 'plain') return (warpIndex + weftIndex) % 2 === 0;
  if (weave === 'basket') return (Math.floor(warpIndex / 2) + Math.floor(weftIndex / 2)) % 2 === 0;
  return modulo(warpIndex - weftIndex, 4) < 2;
}
export function threadSequence(bands, mirror, period) {
  const colors = expandedBands(bands, mirror).flatMap(band => Array.from({ length: band.width }, () => band.color));
  let factor = 1;
  // Color and weave repeats must both close, including odd thread counts.
  while ((colors.length * factor) % period !== 0) factor++;
  return Array.from({ length: factor }, () => colors).flat();
}
function threads(bands, mirror, period) {
  return threadSequence(bands, mirror, period).map(color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)));
}
export function geometricRole(geometry, x, y) {
  if (geometry.type === 'quilt') return blockRole(geometry, x, y);
  const u = x / geometry.cell, v = y / geometry.cell;
  const point = gridPoint(x, y, geometry.cell);
  if (geometry.type === 'checkerboard') return modulo(point.column + point.row, 2);
  const a = u + v, b = u - v;
  const parity = n => modulo(Math.floor(n), 2);
  if (geometry.type === 'harlequin') return (parity(a) + parity(b)) % 2;
  if (Math.min(Math.abs(fraction(a) - 0.5), Math.abs(fraction(b) - 0.5)) * geometry.cell / Math.SQRT2 < geometry.line / 2) return 3;
  return parity(a) === parity(b) ? parity(a) + 1 : 0;
}
function makeGeometricTile(state, textured) {
  const canvas = document.createElement('canvas');
  canvas.width = state.geometry.cell * (state.geometry.columns || 2);
  canvas.height = state.geometry.cell * (state.geometry.rows || 2);
  canvas.dataset.yarnPixels = '2';
  const c = canvas.getContext('2d'), image = c.createImageData(canvas.width, canvas.height);
  const colors = state.warp.map(b => [1, 3, 5].map(i => parseInt(b.color.slice(i, i + 2), 16)));
  const amount = textured ? state.texture : 0;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const color = colors[geometricRole(state.geometry, x + 0.5, y + 0.5)];
    const grain = (((x * 17 + y * 31) % 19) / 19 - 0.5) * amount * 0.06;
    const at = (y * canvas.width + x) * 4;
    for (let k = 0; k < 3; k++) image.data[at + k] = color[k] * (1 + grain);
    image.data[at + 3] = 255;
  }
  c.putImageData(image, 0, 0);
  return canvas;
}
export function makeTile(state, textured = true) {
  if (state.geometry) return makeGeometricTile(state, textured);
  const period = WEAVE_PERIOD[state.weave];
  const warp = threads(state.warp, state.mirror, period);
  const weft = threads(state.linked ? state.warp : state.weft, state.mirror, period);
  const canvas = document.createElement('canvas');
  const yarnPixels = Math.min(2, 4096 / Math.max(warp.length, weft.length));
  canvas.width = Math.max(1, Math.round(warp.length * yarnPixels));
  canvas.height = Math.max(1, Math.round(weft.length * yarnPixels));
  canvas.dataset.warpThreads = warp.length;
  canvas.dataset.weftThreads = weft.length;
  canvas.dataset.yarnPixels = yarnPixels;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  const amount = textured ? state.texture : 0;
  for (let y = 0; y < canvas.height; y++) {
    const ty = Math.min(weft.length - 1, Math.floor((y + 0.5) / canvas.height * weft.length));
    for (let x = 0; x < canvas.width; x++) {
      const tx = Math.min(warp.length - 1, Math.floor((x + 0.5) / canvas.width * warp.length));
      const onTop = warpFaceUp(state.weave, tx, ty);
      const top = onTop ? warp[tx] : weft[ty];
      const bottom = onTop ? weft[ty] : warp[tx];
      const grain = (((tx * 17 + ty * 31) % 19) / 19 - 0.5) * amount * 0.1;
      const rib = ((onTop ? x : y) % 2 === 0 ? 0.06 : -0.08) * amount;
      const idx = (y * canvas.width + x) * 4;
      for (let k = 0; k < 3; k++) image.data[idx + k] = (top[k] * 0.9 + bottom[k] * 0.1) * (1 + grain + rib);
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
export function validateProject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || typeof value.name !== 'string' || value.name.length > 80) throw new Error('不是有效的格纹项目');
  for (const axis of ['warp', 'weft']) {
    if (!Array.isArray(value[axis]) || value[axis].length < 1 || value[axis].length > 32) throw new Error('条带数量应为 1–32');
    for (const b of value[axis]) if (!b || typeof b !== 'object' || Array.isArray(b) || typeof b.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(b.color) || !Number.isInteger(b.width) || b.width < 1 || b.width > 256) throw new Error('条带颜色或纱线数无效（1–256 根）');
  }
  if (!['plain', 'twill', 'basket'].includes(value.weave) || typeof value.linked !== 'boolean' || typeof value.mirror !== 'boolean') throw new Error('织法设置无效');
  if (!Number.isFinite(value.texture) || value.texture < 0 || value.texture > 1 || !Number.isFinite(value.scale) || value.scale < 0.4 || value.scale > 2.4 || !Number.isInteger(value.palette) || value.palette < 0 || value.palette >= PALETTES.length) throw new Error('预览设置无效');
  const result = { version: 1, name: value.name, warp: value.warp.map(b => ({ color: b.color, width: b.width })), weft: value.weft.map(b => ({ color: b.color, width: b.width })), linked: value.linked, mirror: value.mirror, weave: value.weave, texture: value.texture, scale: value.scale, palette: value.palette };
  if (value.geometry !== undefined) {
    const g = value.geometry;
    if (!g || typeof g !== 'object' || Array.isArray(g) || !value.linked || value.mirror) throw new Error('几何纹样参数无效');
    if (g.type === 'quilt') result.geometry = validateBlock(g, value.warp.length);
    else {
      if (!['checkerboard', 'argyle', 'harlequin'].includes(g.type) || !Number.isInteger(g.cell) || g.cell < 8 || g.cell > 128 || !Number.isInteger(g.line) || g.line < 1 || g.line > 8 || value.warp.length !== (g.type === 'argyle' ? 4 : 2)) throw new Error('几何纹样参数无效');
      result.geometry = { type: g.type, cell: g.cell, line: g.line };
    }
  }
  if (value.origin !== undefined) {
    if (typeof value.origin !== 'string' || !/^(template|clan):[a-z0-9-]{1,64}$/.test(value.origin)) throw new Error('纹样来源标记无效');
    result.origin = value.origin;
  }
  return result;
}
