import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Minimize, Crosshair, Play, Square, Activity, Database, Zap, Settings2 } from 'lucide-react';
import { mandelbulb4D, sampleColorMap, ColorMapName } from '@/lib/mandelbulb';
import { SciSlider } from '@/components/ui/SciSlider';
import { SciButton } from '@/components/ui/SciButton';
import { cn } from '@/lib/utils';

interface FractalParams {
  power: number;
  maxIter: number;
  resolution: number;
  wSlice: number;
  bounds: number;
  cx: number;
  cy: number;
  zoom: number;
  colorMap: ColorMapName;
}

export default function Explorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [params, setParams] = useState<FractalParams>({
    power: 8,
    maxIter: 35,
    resolution: 300,
    wSlice: 0.0,
    bounds: 1.5,
    cx: 0,
    cy: 0,
    zoom: 1,
    colorMap: 'quantum',
  });
  
  // To avoid stale closures in loops without constant re-renders
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [renderStats, setRenderStats] = useState({ timeMs: 0, pixels: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Quantum Framework Readout State
  const [cycleCount, setCycleCount] = useState(0);

  // Render ID to cancel stale renders
  const renderIdRef = useRef(0);

  const renderFractal = useCallback(async (overrideW?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    renderIdRef.current++;
    const currentId = renderIdRef.current;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const p = paramsRef.current;
    const res = p.resolution;
    const wVal = overrideW !== undefined ? overrideW : p.wSlice;
    
    // Resize canvas internal buffer if needed
    if (canvas.width !== res || canvas.height !== res) {
      canvas.width = res;
      canvas.height = res;
    }

    const imgData = new ImageData(res, res);
    const data = imgData.data;

    setIsRendering(true);
    setProgress(0);
    const tStart = performance.now();

    // Chunk size: number of rows to process before yielding to main thread
    const chunkRows = Math.max(2, Math.floor(6000 / res)); 

    for (let py = 0; py < res; py++) {
      if (renderIdRef.current !== currentId) return; // Cancelled

      for (let px = 0; px < res; px++) {
        // Map screen to world
        const aspect = 1.0; 
        const x0 = p.cx + ((px / res) - 0.5) * 2 * p.bounds / p.zoom;
        const y0 = p.cy + ((py / res) - 0.5) * 2 * p.bounds / p.zoom;

        const val = mandelbulb4D(x0, y0, 0, wVal, p.power, p.maxIter, 4.0);

        const idx = (py * res + px) * 4;
        
        if (val === p.maxIter) {
          // Inside the set
          data[idx] = 0;
          data[idx+1] = 0;
          data[idx+2] = 0;
          data[idx+3] = 255;
        } else {
          // Outside - apply colormap
          const t = val / p.maxIter;
          const [r, g, b] = sampleColorMap(p.colorMap, t);
          data[idx] = r;
          data[idx+1] = g;
          data[idx+2] = b;
          data[idx+3] = 255;
        }
      }

      if (py % chunkRows === 0) {
        ctx.putImageData(imgData, 0, 0);
        setProgress(py / res);
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    if (renderIdRef.current === currentId) {
      ctx.putImageData(imgData, 0, 0);
      setIsRendering(false);
      setProgress(1);
      setRenderStats({
        timeMs: Math.round(performance.now() - tStart),
        pixels: res * res
      });
      setCycleCount(c => c + 1);
    }
  }, []);

  // Trigger initial render and render on param change (when not animating)
  useEffect(() => {
    if (!isAnimating) {
      renderFractal();
    }
  }, [
    params.power, 
    params.maxIter, 
    params.resolution, 
    params.bounds, 
    params.cx, 
    params.cy, 
    params.zoom, 
    params.colorMap,
    params.wSlice,
    isAnimating,
    renderFractal
  ]);

  // Animation Loop for W-Slice
  useEffect(() => {
    if (!isAnimating) return;
    
    let active = true;
    let currentW = paramsRef.current.wSlice;
    let dir = 1;
    const speed = 0.04;

    const runLoop = async () => {
      while (active) {
        currentW += speed * dir;
        if (currentW >= 1.2) { currentW = 1.2; dir = -1; }
        if (currentW <= -1.2) { currentW = -1.2; dir = 1; }
        
        setParams(p => ({ ...p, wSlice: currentW }));
        
        await renderFractal(currentW);
        
        if (!active) break;
        // Small yield to let React process any other state
        await new Promise(r => setTimeout(r, 0));
      }
    };

    runLoop();
    return () => { active = false; };
  }, [isAnimating, renderFractal]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsAnimating(a => !a);
      } else if (e.code === 'KeyR') {
        setParams(p => ({ ...p, cx: 0, cy: 0, zoom: 1, wSlice: 0 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Canvas Interactions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const px = (x / rect.width) * params.resolution;
    const py = (y / rect.height) * params.resolution;
    
    const newCx = params.cx + ((px / params.resolution) - 0.5) * 2 * params.bounds / params.zoom;
    const newCy = params.cy + ((py / params.resolution) - 0.5) * 2 * params.bounds / params.zoom;
    
    setParams(p => ({ ...p, cx: newCx, cy: newCy }));
  };

  const handleZoomIn = () => setParams(p => ({ ...p, zoom: p.zoom * 2 }));
  const handleZoomOut = () => setParams(p => ({ ...p, zoom: Math.max(0.1, p.zoom / 2) }));
  const handleResetView = () => setParams(p => ({ ...p, cx: 0, cy: 0, zoom: 1 }));

  // Calculated stats for Quantum panel
  const entanglement = 0.92 + 0.08 * ((cycleCount % 6) / 5);
  const errorRate = Math.max(0, 0.018 - 0.0005 * cycleCount);
  const cooldown = Math.max(4.5 - 0.15 * (cycleCount / 3), 1.2).toFixed(2);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <div className="scanline" />

      {/* LEFT SIDEBAR: Controls */}
      <motion.aside 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-80 h-full p-6 flex flex-col gap-6 sci-panel border-l-0 border-y-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center gap-3 border-b border-surface-border pb-4">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-primary text-glow leading-tight">Mandelbulb</h1>
            <h2 className="text-[10px] font-mono tracking-[0.3em] text-primary/60">4D Space Explorer</h2>
          </div>
        </div>

        <div className="flex flex-col gap-5 flex-grow">
          <SciSlider 
            label="Power (n)" 
            min={2} max={20} step={0.1} 
            value={params.power} 
            onChange={(v) => setParams(p => ({ ...p, power: v }))} 
            formatValue={v => v.toFixed(1)}
          />
          
          <SciSlider 
            label="W-Slice (4th Dim)" 
            min={-1.5} max={1.5} step={0.01} 
            value={params.wSlice} 
            onChange={(v) => { setIsAnimating(false); setParams(p => ({ ...p, wSlice: v })); }} 
            formatValue={v => v.toFixed(3)}
          />

          <SciSlider 
            label="Max Iterations" 
            min={10} max={150} step={1} 
            value={params.maxIter} 
            onChange={(v) => setParams(p => ({ ...p, maxIter: v }))} 
          />
          
          <SciSlider 
            label="Resolution (px)" 
            min={100} max={800} step={10} 
            value={params.resolution} 
            onChange={(v) => setParams(p => ({ ...p, resolution: v }))} 
          />

          <div className="mt-2 space-y-3">
            <label className="text-xs uppercase tracking-widest text-primary/70 font-semibold">Color Map</label>
            <div className="grid grid-cols-2 gap-2">
              {(['quantum', 'inferno', 'plasma', 'viridis'] as ColorMapName[]).map(map => (
                <SciButton 
                  key={map}
                  variant="ghost"
                  active={params.colorMap === map}
                  onClick={() => setParams(p => ({ ...p, colorMap: map }))}
                  className="text-[11px] py-1.5"
                >
                  {map}
                </SciButton>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-surface-border pt-6 flex flex-col gap-3">
          <SciButton 
            variant={isAnimating ? "danger" : "primary"}
            onClick={() => setIsAnimating(!isAnimating)}
            className="w-full flex items-center justify-center gap-2"
          >
            {isAnimating ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isAnimating ? "Halt Scan" : "Animate W-Slice"}
          </SciButton>
          {!isAnimating && (
            <SciButton onClick={() => renderFractal()} variant="ghost" className="w-full">
              Force Render
            </SciButton>
          )}
        </div>
      </motion.aside>

      {/* CENTER: Canvas Area */}
      <main className="flex-1 relative flex items-center justify-center p-6 sm:p-12 overflow-hidden">
        
        {/* Fractal Canvas Container */}
        <div className="relative w-full max-w-[800px] aspect-square sci-panel p-1 border-primary/30 rounded-sm">
          {/* Grid background overlay for style */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,204,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,204,0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full object-contain cursor-crosshair mix-blend-screen bg-black"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Progress Bar overlay */}
          <AnimatePresence>
            {isRendering && progress < 1 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute bottom-0 left-0 h-1 bg-primary shadow-[0_0_10px_#00ffcc]"
                style={{ width: `${progress * 100}%` }}
              />
            )}
          </AnimatePresence>
          
          {/* Overlay Tools */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <SciButton variant="ghost" onClick={handleZoomIn} className="p-2 bg-surface/50 backdrop-blur-md">
              <Maximize className="w-4 h-4" />
            </SciButton>
            <SciButton variant="ghost" onClick={handleZoomOut} className="p-2 bg-surface/50 backdrop-blur-md">
              <Minimize className="w-4 h-4" />
            </SciButton>
            <SciButton variant="ghost" onClick={handleResetView} className="p-2 bg-surface/50 backdrop-blur-md mt-4">
              <Crosshair className="w-4 h-4" />
            </SciButton>
          </div>
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-8 text-xs font-mono text-primary/60 tracking-wider bg-surface/80 px-6 py-2 border border-surface-border rounded-full backdrop-blur-md">
          <span>T: {renderStats.timeMs}ms</span>
          <span>PX: {(renderStats.pixels / 1000).toFixed(1)}k</span>
          <span>W: {params.wSlice.toFixed(4)}</span>
        </div>
      </main>

      {/* RIGHT SIDEBAR: Quantum Stats */}
      <motion.aside 
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="w-72 h-full p-6 sci-panel border-r-0 border-y-0 z-10 flex flex-col font-mono"
      >
        <div className="flex items-center gap-3 border-b border-surface-border pb-4 mb-6 text-primary">
          <Database className="w-5 h-5" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-glow">Quantum Telemetry</h2>
        </div>

        <div className="space-y-6 flex-grow text-xs text-primary/80">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="opacity-60">SYS.CYCLE_COUNT</span>
              <span className="text-primary text-glow">{String(cycleCount).padStart(5, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">STATUS</span>
              <span className={cn(isRendering ? "text-accent animate-pulse" : "text-primary")}>
                {isRendering ? "COMPUTING" : "IDLE"}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-surface-border/50 pt-4">
            <div className="flex justify-between items-end">
              <span className="opacity-60">ENTANGLEMENT</span>
              <span className="text-primary text-glow">{(entanglement * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${entanglement * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-surface-border/50 pt-4">
            <div className="flex justify-between">
              <span className="opacity-60">COHERENCE_ERR</span>
              <span className="text-accent text-glow-accent">{errorRate.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">COOLDOWN_TMR</span>
              <span>{cooldown}</span>
            </div>
          </div>

          <div className="mt-8 border border-surface-border bg-black/50 p-3 rounded-sm font-mono text-[10px] leading-tight text-primary/40 break-all">
            <p className="mb-2 text-primary/60 border-b border-primary/20 pb-1 flex items-center gap-2">
              <Zap className="w-3 h-3" /> MATH.SIG
            </p>
            {`x'=r^n*sin(T)cos(P)\ny'=r^n*sin(T)sin(P)\nz'=r^n*cos(T)\nw'=...`}
            <br/><br/>
            {`> C=${params.cx.toFixed(2)},${params.cy.toFixed(2)}`}
            <br/>
            {`> ITER=${params.maxIter}`}
            <br/>
            {`> RES=${params.resolution}x${params.resolution}`}
          </div>
        </div>

        <div className="border-t border-surface-border pt-4 text-center">
           <Settings2 className="w-4 h-4 text-primary/40 mx-auto animate-spin-slow" style={{ animationDuration: '10s' }} />
        </div>
      </motion.aside>

    </div>
  );
}
