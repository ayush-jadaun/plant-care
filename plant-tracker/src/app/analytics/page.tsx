"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { usePlantSocket } from "@/lib/socket";
import { calculateHealth, soilAnalogToPercent } from "@/lib/thresholds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Droplets,
  Thermometer,
  Sun,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Hand,
  Clock,
  FileDown,
} from "lucide-react";
import Plant3D from "@/components/Plant3D";
import { exportPlantReportPDF } from "@/lib/pdfExport";

interface Reading {
  timestamp: number;
  temp: number;
  humidity: number;
  soilAnalog: number;
  lux: number;
  healthScore: number;
}

const RANGES = [
  { label: "Live", value: "live" },
  { label: "24h", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

const COLORS = {
  temp: "#f59e0b",
  humidity: "#3b82f6",
  soil: "#8b5cf6",
  lux: "#f97316",
  health: "#22c55e",
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  subvalue,
  color,
  trend,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  unit: string;
  subvalue?: string;
  color: string;
  trend?: "up" | "down" | "stable";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      <div
        className="absolute top-0 right-0 size-24 opacity-10 blur-2xl pointer-events-none"
        style={{ background: color }}
      />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="size-4" style={{ color }} />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          </div>
          {trend && <TrendIcon className="size-3 text-muted-foreground" />}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color }}>
            {value}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {subvalue && <div className="text-xs text-muted-foreground mt-1">{subvalue}</div>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("24h");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [liveReadings, setLiveReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const { sensorData } = usePlantSocket();

  useEffect(() => {
    if (range === "live") {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/readings?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        setReadings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    if (!sensorData) return;
    const health = calculateHealth(sensorData);
    const reading: Reading = {
      timestamp: sensorData.timestamp,
      temp: sensorData.temp,
      humidity: sensorData.humidity,
      soilAnalog: sensorData.soilAnalog,
      lux: sensorData.lux,
      healthScore: health.score,
    };
    setLiveReadings((prev) => [...prev.slice(-119), reading]);
  }, [sensorData]);

  const displayReadings = range === "live" ? liveReadings : readings;

  const stats = useMemo(() => {
    const emptyStats = {
      temp: { avg: 0, min: 0, max: 0, trend: "stable" as const },
      humidity: { avg: 0, min: 0, max: 0, trend: "stable" as const },
      soil: { avg: 0, min: 0, max: 0, trend: "stable" as const },
      lux: { avg: 0, min: 0, max: 0, trend: "stable" as const },
      health: { avg: 0, min: 0, max: 0, trend: "stable" as const },
      count: 0,
    };
    if (displayReadings.length === 0) return emptyStats;

    const compute = (values: number[]): { avg: number; min: number; max: number; trend: "up" | "down" | "stable" } => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = values.reduce((a, b) => Math.min(a, b), Infinity);
      const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
      if (values.length < 4) return { avg, min, max, trend: "stable" };
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      const threshold = Math.abs(avg) * 0.05;
      const trend = diff > threshold ? "up" : diff < -threshold ? "down" : "stable";
      return { avg, min, max, trend };
    };

    return {
      temp: compute(displayReadings.map((r) => r.temp)),
      humidity: compute(displayReadings.map((r) => r.humidity)),
      soil: compute(displayReadings.map((r) => soilAnalogToPercent(r.soilAnalog))),
      lux: compute(displayReadings.map((r) => r.lux)),
      health: compute(displayReadings.map((r) => r.healthScore ?? 0)),
      count: displayReadings.length,
    };
  }, [displayReadings]);

  const radarData = useMemo(() => {
    const last = displayReadings[displayReadings.length - 1];
    if (!last)
      return [
        { metric: "Temp", value: 0, ideal: 100 },
        { metric: "Humidity", value: 0, ideal: 100 },
        { metric: "Soil", value: 0, ideal: 100 },
        { metric: "Light", value: 0, ideal: 100 },
      ];
    const health = calculateHealth({
      temp: last.temp,
      humidity: last.humidity,
      soilAnalog: last.soilAnalog,
      soilDry: false,
      lux: last.lux,
      touch: false,
      timestamp: last.timestamp,
    });
    return [
      { metric: "Temp", value: health.sensorScores.temp, ideal: 100 },
      { metric: "Humidity", value: health.sensorScores.humidity, ideal: 100 },
      { metric: "Soil", value: health.sensorScores.soilMoisture, ideal: 100 },
      { metric: "Light", value: health.sensorScores.lux, ideal: 100 },
    ];
  }, [displayReadings]);

  const scatterData = useMemo(
    () =>
      displayReadings.map((r) => ({
        temp: r.temp,
        humidity: r.humidity,
        health: r.healthScore ?? 0,
      })),
    [displayReadings]
  );

  const hourlyData = useMemo(() => {
    const hours: Record<number, { hour: number; temp: number; humidity: number; lux: number; count: number }> = {};
    displayReadings.forEach((r) => {
      const h = new Date(r.timestamp * 1000).getHours();
      if (!hours[h]) hours[h] = { hour: h, temp: 0, humidity: 0, lux: 0, count: 0 };
      hours[h].temp += r.temp;
      hours[h].humidity += r.humidity;
      hours[h].lux += r.lux;
      hours[h].count += 1;
    });
    return Object.values(hours)
      .map((h) => ({
        hour: `${h.hour}:00`,
        temp: +(h.temp / h.count).toFixed(1),
        humidity: +(h.humidity / h.count).toFixed(1),
        lux: +(h.lux / h.count).toFixed(0),
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [displayReadings]);

  const chartData = displayReadings.map((r) => ({
    timestamp: r.timestamp,
    temp: r.temp,
    humidity: r.humidity,
    soil: soilAnalogToPercent(r.soilAnalog),
    lux: r.lux,
    health: r.healthScore ?? 0,
  }));

  const currentHealth = stats.health.avg;
  const currentState: "thriving" | "okay" | "stressed" | "critical" =
    currentHealth >= 80
      ? "thriving"
      : currentHealth >= 60
      ? "okay"
      : currentHealth >= 40
      ? "stressed"
      : "critical";

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plant Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.count} readings • {range === "live" ? "Live streaming" : `Last ${range}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => setRange(r.value)}
            >
              {r.value === "live" && (
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse mr-1" />
              )}
              {r.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Fetch weather and care advice for the PDF
              let weather, careAdvice;
              try {
                const wRes = await fetch("/api/weather");
                weather = await wRes.json();
              } catch {}
              try {
                const configRes = await fetch("/api/config");
                const config = await configRes.json();
                const latest = displayReadings[displayReadings.length - 1];
                if (latest && weather) {
                  const cRes = await fetch("/api/care-prediction", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sensorData: {
                        temp: latest.temp,
                        humidity: latest.humidity,
                        soilMoisture: soilAnalogToPercent(latest.soilAnalog),
                        lux: latest.lux,
                        healthScore: latest.healthScore,
                      },
                      weather,
                      plantName: config.plantName || "My Plant",
                    }),
                  });
                  const cData = await cRes.json();
                  careAdvice = cData.advice;
                }
                exportPlantReportPDF({
                  plantName: config.plantName || "My Plant",
                  range,
                  stats,
                  readings: displayReadings,
                  weather,
                  careAdvice,
                });
              } catch (err) {
                console.error("PDF export failed", err);
              }
            }}
          >
            <FileDown className="size-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={Thermometer}
          label="Temperature"
          value={stats.temp.avg.toFixed(1)}
          unit="°C"
          subvalue={`${stats.temp.min.toFixed(1)} → ${stats.temp.max.toFixed(1)}`}
          color={COLORS.temp}
          trend={stats.temp.trend}
        />
        <StatCard
          icon={Droplets}
          label="Humidity"
          value={stats.humidity.avg.toFixed(0)}
          unit="%"
          subvalue={`${stats.humidity.min.toFixed(0)} → ${stats.humidity.max.toFixed(0)}`}
          color={COLORS.humidity}
          trend={stats.humidity.trend}
        />
        <StatCard
          icon={Activity}
          label="Soil"
          value={stats.soil.avg.toFixed(0)}
          unit="%"
          subvalue={`${stats.soil.min.toFixed(0)} → ${stats.soil.max.toFixed(0)}`}
          color={COLORS.soil}
          trend={stats.soil.trend}
        />
        <StatCard
          icon={Sun}
          label="Light"
          value={stats.lux.avg.toFixed(0)}
          unit="lux"
          subvalue={`${stats.lux.min.toFixed(0)} → ${stats.lux.max.toFixed(0)}`}
          color={COLORS.lux}
          trend={stats.lux.trend}
        />
        <StatCard
          icon={Heart}
          label="Health"
          value={stats.health.avg.toFixed(0)}
          unit="%"
          subvalue={`${stats.health.min.toFixed(0)} → ${stats.health.max.toFixed(0)}`}
          color={COLORS.health}
          trend={stats.health.trend}
        />
      </div>

      {/* 3D Plant + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="size-4" /> 3D Plant Model — drag to rotate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Plant3D
              healthScore={currentHealth}
              state={currentState}
              temp={stats.temp.avg}
              humidity={stats.humidity.avg}
              soilMoisture={stats.soil.avg}
              lux={stats.lux.avg}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sensor Balance Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Radar
                  name="Ideal"
                  dataKey="ideal"
                  stroke="var(--border)"
                  fill="var(--border)"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Current"
                  dataKey="value"
                  stroke={COLORS.health}
                  fill={COLORS.health}
                  fillOpacity={0.4}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Multi-series area chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="size-4" /> All Sensors Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.temp} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.temp} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="humidityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.humidity} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.humidity} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.soil} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={COLORS.soil} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
              />
              <Legend />
              <Area type="monotone" dataKey="temp" stroke={COLORS.temp} fill="url(#tempGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="humidity" stroke={COLORS.humidity} fill="url(#humidityGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="soil" stroke={COLORS.soil} fill="url(#soilGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Health score timeline */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Heart className="size-4" /> Health Score Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.health} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={COLORS.health} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
              />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
              />
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" />
              <ReferenceLine y={60} stroke="#84cc16" strokeDasharray="3 3" />
              <ReferenceLine y={40} stroke="#eab308" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="health" stroke={COLORS.health} fill="url(#healthGrad)" strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hourly + scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="size-4" /> Hourly Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="temp" fill={COLORS.temp} name="Temp" radius={[4, 4, 0, 0]} />
                <Bar dataKey="humidity" fill={COLORS.humidity} name="Humidity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="size-4" /> Temp vs Humidity Correlation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="temp"
                  name="Temp"
                  unit="°C"
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="humidity"
                  name="Humidity"
                  unit="%"
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
                <Scatter name="Readings" data={scatterData} fill={COLORS.health} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Individual line charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: "temp", label: "Temperature", color: COLORS.temp },
          { key: "humidity", label: "Humidity", color: COLORS.humidity },
          { key: "soil", label: "Soil Moisture", color: COLORS.soil },
          { key: "lux", label: "Light Intensity", color: COLORS.lux },
        ].map((cfg) => (
          <Card key={cfg.key} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{cfg.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey={cfg.key}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <div className="text-center text-muted-foreground py-6">Loading data...</div>}
      {!loading && displayReadings.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-12 flex flex-col items-center justify-center">
            <Hand className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No data yet for this range.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Connect your ESP32 and let it collect some readings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
