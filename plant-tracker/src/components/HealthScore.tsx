"use client";

import { useEffect, useState } from "react";

interface HealthScoreProps {
  score: number;
  state: "thriving" | "okay" | "stressed" | "critical";
}

const stateColors = {
  thriving: "#22c55e",
  okay: "#84cc16",
  stressed: "#eab308",
  critical: "#ef4444",
};

const stateLabels = {
  thriving: "Thriving!",
  okay: "Doing Okay",
  stressed: "Stressed",
  critical: "Critical!",
};

export default function HealthScore({ score, state }: HealthScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = stateColors[state];

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
      <svg width="160" height="100" viewBox="0 0 160 100">
        <path
          d="M 20 90 A 60 60 0 0 1 140 90"
          fill="none"
          stroke="#1f2937"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 90 A 60 60 0 0 1 140 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <span
        className="text-4xl font-bold -mt-4 transition-colors duration-500"
        style={{ color }}
      >
        {animatedScore}%
      </span>
      <span className="text-sm mt-1" style={{ color }}>
        {stateLabels[state]}
      </span>
    </div>
  );
}
