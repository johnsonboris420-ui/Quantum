/**
 * 4D Mandelbulb Math and Color Mapping
 */

export function mandelbulb4D(
  cx: number,
  cy: number,
  cz: number,
  cw: number,
  n: number,
  maxIter: number,
  bailout: number = 4.0
): number {
  let x = 0, y = 0, z = 0, w = 0;
  
  for (let i = 0; i < maxIter; i++) {
    const rXY = Math.hypot(x, y);
    const rXYZ = Math.hypot(rXY, z);
    const r = Math.hypot(rXYZ, w);
    
    if (r > bailout) {
      if (n === 1) return i + 1;
      // Smooth shading optimization
      return i + 1 - Math.log(Math.log(r) / Math.log(bailout)) / Math.log(n);
    }
    
    let phi = 0, theta = 0, psi = 0;
    if (r !== 0) {
      phi = Math.atan2(y, x);
      theta = Math.atan2(z, rXY);
      psi = Math.atan2(w, rXYZ);
    }
    
    const rn = Math.pow(r, n);
    const cosP = Math.cos(n * psi), sinP = Math.sin(n * psi);
    const cosT = Math.cos(n * theta), sinT = Math.sin(n * theta);
    const cosF = Math.cos(n * phi), sinF = Math.sin(n * phi);
    
    x = rn * cosP * cosT * cosF + cx;
    y = rn * cosP * cosT * sinF + cy;
    z = rn * cosP * sinT + cz;
    w = rn * sinP + cw;
  }
  
  return maxIter; // Inside the set
}

export type ColorMapName = 'inferno' | 'plasma' | 'viridis' | 'quantum';

const MAPS: Record<ColorMapName, number[][]> = {
  inferno: [[0,0,4], [40,11,84], [101,21,110], [159,42,99], [212,72,66], [245,124,21], [250,193,39], [252,255,164]],
  plasma: [[13,8,135], [84,2,163], [139,10,165], [185,50,137], [219,92,104], [244,136,73], [254,188,43], [240,249,33]],
  viridis: [[68,1,84], [72,35,116], [64,67,135], [52,94,141], [41,120,142], [32,144,140], [34,167,132], [68,190,112], [121,209,81], [189,223,38], [253,231,37]],
  quantum: [[0,0,0], [2,10,30], [5,40,90], [0,120,200], [0,220,255], [150,250,255], [255,255,255]]
};

export function sampleColorMap(mapName: ColorMapName, t: number): [number, number, number] {
  let mappedT = Math.pow(t, 0.4); // Logarithmic-ish normalization for more fractal detail
  
  // Custom sinusoidal banding for quantum to make it look highly scientific
  if (mapName === 'quantum') {
    mappedT = mappedT + 0.05 * Math.sin(mappedT * Math.PI * 30);
  }
  
  mappedT = Math.max(0, Math.min(1, mappedT));
  
  const map = MAPS[mapName];
  if (mappedT <= 0) return [map[0][0], map[0][1], map[0][2]];
  if (mappedT >= 1) return [map[map.length - 1][0], map[map.length - 1][1], map[map.length - 1][2]];
  
  const i = mappedT * (map.length - 1);
  const idx = Math.floor(i);
  const frac = i - idx;
  
  const c1 = map[idx];
  const c2 = map[idx + 1];
  
  return [
    Math.round(c1[0] + frac * (c2[0] - c1[0])),
    Math.round(c1[1] + frac * (c2[1] - c1[1])),
    Math.round(c1[2] + frac * (c2[2] - c1[2]))
  ];
}
