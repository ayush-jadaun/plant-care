"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface HealthScoreProps {
  score: number;
  state: "thriving" | "okay" | "stressed" | "critical";
}

const stateConfig = {
  thriving: { color: "var(--color-sensor-green)", hex: "#34d399", label: "Thriving" },
  okay: { color: "var(--color-sensor-lime)", hex: "#a3e635", label: "Doing Okay" },
  stressed: { color: "var(--color-sensor-amber)", hex: "#fbbf24", label: "Stressed" },
  critical: { color: "var(--color-sensor-rose)", hex: "#fb7185", label: "Critical" },
};

export default function HealthScore({ score, state }: HealthScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = stateConfig[state];

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="size-4" />
            Health Score
          </CardTitle>
          <Badge
            variant="outline"
            className="border-transparent text-xs font-medium"
            style={{
              backgroundColor: `color-mix(in oklch, ${config.hex}, transparent 88%)`,
              color: config.hex,
            }}
          >
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-2 pb-6">
        <div className="relative">
          <svg width="160" height="100" viewBox="0 0 160 100">
            <path
              d="M 20 90 A 60 60 0 0 1 140 90"
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 20 90 A 60 60 0 0 1 140 90"
              fill="none"
              stroke={config.hex}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px color-mix(in oklch, ${config.hex}, transparent 50%))` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span
              className="text-3xl font-bold tabular-nums transition-colors duration-500"
              style={{ color: config.hex }}
            >
              {animatedScore}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
