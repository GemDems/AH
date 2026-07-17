import { useEffect, useRef } from "react";

export type Direction = "implode" | "burst" | "diag" | "fall";

export type Palette = {
  name: string;
  colors: [number, number, number][];
};

export const PALETTES: Palette[] = [
  { name: "Ember", colors: [[26, 4, 22], [192, 30, 70], [255, 132, 168]] },
  { name: "Lime",  colors: [[18, 56, 12], [142, 205, 38], [228, 244, 96]] },
  { name: "Bloom", colors: [[58, 12, 64], [210, 50, 165], [255, 148, 222]] },
  { name: "Solar", colors: [[58, 8, 12], [228, 80, 28], [248, 215, 78]] },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getColor(palette: Palette, energy: number) {
  const e = Math.max(0, Math.min(1, energy));
  const c = palette.colors;
  if (e < 0.5) {
    const t = e * 2;
    return [
      Math.round(lerp(c[0][0], c[1][0], t)),
      Math.round(lerp(c[0][1], c[1][1], t)),
      Math.round(lerp(c[0][2], c[1][2], t)),
    ];
  }
  const t = (e - 0.5) * 2;
  return [
    Math.round(lerp(c[1][0], c[2][0], t)),
    Math.round(lerp(c[1][1], c[2][1], t)),
    Math.round(lerp(c[1][2], c[2][2], t)),
  ];
}

function getEnergy(
  nx: number,
  ny: number,
  time: number,
  direction: Direction,
  originX: number,
  originY: number,
) {
  const cx = 0.5 + originX;
  const cy = 0.5 + originY;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.min(1.2, Math.sqrt(dx * dx + dy * dy) / 0.5);

  let base = 0.4 + dist * 0.5;
  let phase = -dist * 5 + time * 2.6;

  if (direction === "burst") {
    base = 1 - dist * 0.6;
    phase = dist * 5 - time * 2.6;
  }
  if (direction === "diag") {
    const ev = (nx + (1 - ny)) / 2 + (originX - originY) * 0.5;
    base = ev;
    phase = ev * 8 + time * 2.4;
  }
  if (direction === "fall") {
    const ey = 1 - ny + originY;
    base = ey - (nx - 0.5) * originX * 0.9;
    phase = ey * 5 + time * 2.4;
  }

  return (
    base * 0.55 +
    Math.sin(phase) * 0.32 +
    Math.sin(nx * 6.1 + time * 1.1) * 0.09 +
    Math.cos(ny * 5.3 + time * 0.95) * 0.09
  );
}

export interface PixelOrbProps {
  direction?: Direction;
  grid?: number;
  orbitSpeed?: number;
  palette?: Palette;
  seed?: number;
  size?: number;
  speed?: number;
}

export function PixelOrb({
  direction = "implode",
  grid = 6,
  orbitSpeed = 4,
  palette = PALETTES[0],
  seed = 0,
  size = 28,
  speed = 5,
}: PixelOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    let frameId = 0;
    let lastTime: number | null = null;
    let elapsed = seed * 0.35;
    let orbitTime = seed * 0.8;

    const frame = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      elapsed += dt * speed;
      orbitTime += dt * orbitSpeed;

      const originX = Math.cos(orbitTime + seed) * 0.12;
      const originY = Math.sin(orbitTime + seed) * 0.12;
      const pixel = canvas.width / grid;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const nx = x / (grid - 1);
          const ny = y / (grid - 1);
          const c = getColor(
            palette,
            getEnergy(nx, ny, elapsed, direction, originX, originY),
          );
          ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
          ctx.fillRect(x * pixel, y * pixel, pixel + 0.6, pixel + 0.6);
        }
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [direction, grid, orbitSpeed, palette, seed, size, speed]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-hidden="true"
      className="pointer-events-none block shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export interface AgentThinkingBadgeProps {
  label?: string;
  palette?: Palette;
}

export function AgentThinkingBadge({
  label = "Agent Thinking",
  palette = PALETTES[0],
}: AgentThinkingBadgeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="inline-flex h-[36px] items-center gap-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm px-1.5 py-1 pr-3 shadow-lg"
      style={{ animation: "orb-enter 300ms both" }}
    >
      <PixelOrb palette={palette} size={24} />
      <span className="whitespace-nowrap font-mono text-[11px] font-semibold tracking-tight text-white/80">
        {label}
      </span>
    </div>
  );
}

export interface AgentsThinkingBadgeProps {
  label?: string;
  count?: number;
}

export function AgentsThinkingBadge({
  label = "Agents thinking",
  count = 4,
}: AgentsThinkingBadgeProps) {
  const safeCount = Math.max(1, Math.min(6, count));
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="inline-flex h-[36px] items-center gap-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm px-1.5 py-1 pr-3 shadow-lg"
      style={{ animation: "orb-enter 300ms both" }}
    >
      <div className="flex h-[24px] items-center">
        {Array.from({ length: safeCount }).map((_, i) => (
          <div
            key={i}
            style={{
              marginLeft: i === 0 ? 0 : -10,
              zIndex: i + 1,
              animation: `orb-enter 300ms ${i * 110}ms both`,
            }}
          >
            <PixelOrb palette={PALETTES[i % PALETTES.length]} seed={i + 1} size={24} />
          </div>
        ))}
      </div>
      <span className="whitespace-nowrap font-mono text-[11px] font-semibold tracking-tight text-white/80">
        {label}
      </span>
    </div>
  );
}
