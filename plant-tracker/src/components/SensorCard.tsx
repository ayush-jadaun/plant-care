"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Thermometer, Droplets, Sprout, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensorCardProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
  score: number;
  history: number[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "🌡️": Thermometer,
  "💧": Droplets,
  "🌍": Sprout,
  "☀️": Sun,
};

const ACCENT_MAP: Record<string, { color: string; class: string }> = {
  "🌡️": { color: "#f59e0b", class: "text-sensor-amber" },
  "💧": { color: "#38bdf8", class: "text-sensor-sky" },
  "🌍": { color: "#a78bfa", class: "text-sensor-violet" },
  "☀️": { color: "#fb923c", class: "text-sensor-orange" },
};

function getStatusColor(score: number): string {
  if (score >= 70) return "var(--color-sensor-green)";
  if (score >= 40) return "var(--color-sensor-amber)";
  return "var(--color-sensor-rose)";
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 36;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padding + (height - 2 * padding) - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg width={width} height={height} className="mt-3 opacity-60">
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, "")})`}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SensorCard({ label, value, unit, icon, score, history }: SensorCardProps) {
  const statusColor = getStatusColor(score);
  const accent = ACCENT_MAP[icon] || { color: "#94a3b8", class: "text-muted-foreground" };
  const IconComponent = ICON_MAP[icon];

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border transition-all duration-300">
      <CardContent className="flex flex-col items-center pt-5 pb-4">
        <div
          className={cn(
            "flex items-center justify-center size-10 rounded-xl mb-3 transition-colors",
          )}
          style={{
            backgroundColor: `color-mix(in oklch, ${accent.color}, transparent 88%)`,
          }}
        >
          {IconComponent ? (
            <span style={{ color: accent.color }}>
              <IconComponent className="size-5" />
            </span>
          ) : (
            <span className="text-xl">{icon}</span>
          )}
        </div>

        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>

        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>

        <Sparkline data={history} color={accent.color} />

        <div className="w-full mt-3 px-1">
          <div
            className="h-1 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: `color-mix(in oklch, ${statusColor}, transparent 85%)` }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${score}%`, backgroundColor: statusColor }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
