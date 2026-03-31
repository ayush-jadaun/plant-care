"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendChartProps {
  data: { timestamp: number; value: number }[];
  label: string;
  color: string;
  unit: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TrendChart({ data, label, color, unit }: TrendChartProps) {
  const isMultiDay = data.length > 0 &&
    data[data.length - 1].timestamp - data[0].timestamp > 86400;

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={isMultiDay ? formatDate : formatTime}
            stroke="#4b5563"
            tick={{ fontSize: 11 }}
          />
          <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            labelFormatter={(val) => {
              const d = new Date(Number(val) * 1000);
              return d.toLocaleString();
            }}
            formatter={(val) => [`${Number(val).toFixed(1)} ${unit}`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
