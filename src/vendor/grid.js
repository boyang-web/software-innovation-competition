export const modulo = (value, period) => ((value % period) + period) % period;
export const fraction = value => value - Math.floor(value);
export function axisIndices(length, mirror = false) {
  const indices = Array.from({ length }, (_, index) => index);
  return mirror && length > 1 ? [...indices, ...indices.slice(1, -1).reverse()] : indices;
}
export function axisLayout(bands, mirror = false) {
  const indices = axisIndices(bands.length, mirror);
  const weights = bands.map((_, index) => indices.filter(i => i === index).length);
  let start = 0;
  return indices.map((index, position) => {
    const segment = { index, start, width: bands[index].width };
    start += segment.width;
    const right = indices[position + 1];
    if (right !== undefined && right !== index) {
      const divisor = weights[index] === weights[right] ? weights[index] : 1;
      const leftStep = weights[right] / divisor, rightStep = weights[index] / divisor;
      const coefficient = indices.slice(0, position + 1).reduce((sum, i) => sum + (i === index ? leftStep : i === right ? -rightStep : 0), 0);
      if (coefficient) segment.edge = { left: index, right, leftStep, rightStep, coefficient, thread: start };
    }
    return segment;
  });
}
export function axisRegions(bands, pixels, unitPixels) {
  const total = bands.reduce((sum, band) => sum + band.width, 0);
  let units = 0, start = 0;
  return bands.map((band, index) => {
    units += band.width;
    const end = index === bands.length - 1 ? pixels : Math.round(units * (unitPixels ?? pixels / total));
    const region = { index, start, size: end - start };
    start = end;
    return region;
  });
}
export function gridPoint(x, y, width = 1, height = width) {
  return { column: Math.floor(x / width), row: Math.floor(y / height), u: fraction(x / width), v: fraction(y / height) };
}
export function localPoint(x, y, bounds) {
  return { u: (x - bounds.x) / bounds.w, v: (y - bounds.y) / bounds.h };
}
export function cellPolygons(cell) {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const parts = cell.shape === 'half' ? [square.slice(0, 3), [square[0], square[2], square[3]]] : cell.shape === 'quarter' ? square.map((point, i) => [point, square[(i + 1) % 4], [.5, .5]]) : [square];
  return parts.map((points, index) => ({ color: cell.colors[index], points: points.map(([x, y]) => {
    for (let turn = 0; turn < cell.rotation; turn++) [x, y] = [1 - y, x];
    return [x, y];
  }) }));
}
export function blockRole(geometry, x, y) {
  const point = gridPoint(x, y, geometry.cell);
  const cell = geometry.cells[modulo(point.row, geometry.rows) * geometry.columns + modulo(point.column, geometry.columns)];
  let { u, v } = point;
  for (let turn = 0; turn < cell.rotation; turn++) [u, v] = [v, 1 - u];
  const part = cell.shape === 'half' ? (v <= u ? 0 : 1) : cell.shape === 'quarter' ? (v <= u && v <= 1 - u ? 0 : u >= v && u >= 1 - v ? 1 : v >= u && v >= 1 - u ? 2 : 3) : 0;
  return cell.colors[part];
}
export function validateBlock(value, colorCount) {
  if (!value || value.type !== 'quilt' || !Number.isInteger(value.cell) || value.cell < 8 || value.cell > 128 || !Number.isInteger(value.columns) || value.columns < 2 || value.columns > 8 || !Number.isInteger(value.rows) || value.rows < 2 || value.rows > 8 || !Array.isArray(value.cells) || value.cells.length !== value.columns * value.rows) throw new Error('格子单元应为 2–8 行列，格子尺寸 8–128');
  const cells = Array.from(value.cells, cell => {
    const count = { solid: 1, half: 2, quarter: 4 }[cell?.shape];
    if (!count || !Number.isInteger(cell.rotation) || cell.rotation < 0 || cell.rotation > 3 || !Array.isArray(cell.colors) || cell.colors.length !== count || !Array.from(cell.colors).every(color => Number.isInteger(color) && color >= 0 && color < colorCount)) throw new Error('格子形状、旋转或用色无效');
    return { shape: cell.shape, rotation: cell.rotation, colors: [...cell.colors] };
  });
  return { type: 'quilt', cell: value.cell, columns: value.columns, rows: value.rows, cells };
}
