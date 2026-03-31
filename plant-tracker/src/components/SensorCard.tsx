"use client";

interface SensorCardProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
  score: number;
  history: number[];
}

function getStatusColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 40;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="mt-2">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SensorCard({ label, value, unit, icon, score, history }: SensorCardProps) {
  const color = getStatusColor(score);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `2px solid ${color}40`,
        boxShadow: `0 4px 24px ${color}15`,
      }}
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold mt-1" style={{ color }}>
        {value}
        <span className="text-lg font-normal ml-1">{unit}</span>
      </span>
      <Sparkline data={history} color={color} />
      <div
        className="mt-2 w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: `${color}20` }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}
