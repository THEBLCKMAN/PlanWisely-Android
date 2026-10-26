import { motion } from "framer-motion";
import { fmtR } from "@/lib/format";

/* ---------- Smooth line chart (SVG, no deps) ---------- */

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function TrendChart({ data, height = 140 }: { data: number[]; height?: number }) {
  const W = 320;
  const H = height;
  const pad = 8;
  const values = data.length === 0 ? [0, 0] : data.length === 1 ? [data[0], data[0]] : data;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const range = rawMax - rawMin || Math.max(1, rawMax * 0.1);
  const min = rawMin - range * 0.15;
  const max = rawMax + range * 0.15;
  const pts = values.map((v, i) => ({
    x: pad + (i * (W - pad * 2)) / (values.length - 1),
    y: H - pad - ((v - min) / (max - min)) * (H - pad * 2),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendFill)" />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 4 : 2.5}
          fill="var(--color-primary)"
        />
      ))}
    </svg>
  );
}

/* ---------- Donut chart (SVG) ---------- */

export function DonutChart({
  segments,
  size = 150,
  stroke = 22,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
  centerLabel: string;
  centerSub: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = c * frac;
          const el = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.12 }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-foreground">{centerLabel}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{centerSub}</span>
      </div>
    </div>
  );
}

/* ---------- Monthly comparison bars ---------- */

export function ComparisonBars({
  last,
  current,
}: {
  last: { label: string; amount: number };
  current: { label: string; amount: number };
}) {
  const max = Math.max(last.amount, current.amount, 1);
  const bars = [
    { ...last, color: "bg-primary/30" },
    { ...current, color: "bg-primary" },
  ];
  return (
    <div className="flex items-end justify-center gap-10 pt-2">
      {bars.map((b) => (
        <div key={b.label} className="flex w-20 flex-col items-center gap-2">
          <span className="text-sm font-extrabold text-foreground">
            {fmtR(b.amount, { decimals: false })}
          </span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(6, (b.amount / max) * 110)}px` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`w-10 rounded-t-xl ${b.color}`}
          />
          <span className="text-xs font-semibold text-primary">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
