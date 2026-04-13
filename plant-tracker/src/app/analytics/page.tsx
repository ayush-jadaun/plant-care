"use client";

import { useState, useEffect } from "react";
import TrendChart from "@/components/TrendChart";
import { soilAnalogToPercent } from "@/lib/thresholds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2 } from "lucide-react";

interface Reading {
  timestamp: number;
  temp: number;
  humidity: number;
  soilAnalog: number;
  lux: number;
  healthScore: number;
}

interface DailySummary {
  date: string;
  count: number;
  summary: Record<string, { avg: number; min: number; max: number }>;
}

const RANGES = [
  { label: "24h", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
];

/* Premium chart colors */
const CHART_COLORS = {
  temp: "#f59e0b",
  humidity: "#38bdf8",
  soil: "#a78bfa",
  light: "#fb923c",
  health: "#34d399",
};

export default function AnalyticsPage() {
  const [range, setRange] = useState("24h");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    const today = new Date().toISOString().split("T")[0];
    fetch(`/api/summary?date=${today}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) setSummary(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <BarChart3 className="size-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50 border border-border/50">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setRange(r.value)}
              className={
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Loader2 className="size-5 text-muted-foreground animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading data...</p>
          </CardContent>
        </Card>
      ) : readings.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No data yet. Connect your ESP32 to start collecting readings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              data={readings.map((r) => ({ timestamp: r.timestamp, value: r.temp }))}
              label="Temperature"
              color={CHART_COLORS.temp}
              unit="°C"
            />
            <TrendChart
              data={readings.map((r) => ({ timestamp: r.timestamp, value: r.humidity }))}
              label="Humidity"
              color={CHART_COLORS.humidity}
              unit="%"
            />
            <TrendChart
              data={readings.map((r) => ({
                timestamp: r.timestamp,
                value: soilAnalogToPercent(r.soilAnalog),
              }))}
              label="Soil Moisture"
              color={CHART_COLORS.soil}
              unit="%"
            />
            <TrendChart
              data={readings.map((r) => ({ timestamp: r.timestamp, value: r.lux }))}
              label="Light"
              color={CHART_COLORS.light}
              unit="lux"
            />
          </div>

          <TrendChart
            data={readings
              .filter((r) => r.healthScore !== undefined)
              .map((r) => ({ timestamp: r.timestamp, value: r.healthScore }))}
            label="Health Score"
            color={CHART_COLORS.health}
            unit="%"
          />
        </>
      )}

      {summary && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Today&apos;s Summary</CardTitle>
              <Badge variant="secondary" className="text-xs font-mono">
                {summary.count} readings
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Sensor</TableHead>
                  <TableHead className="text-right text-muted-foreground">Avg</TableHead>
                  <TableHead className="text-right text-muted-foreground">Min</TableHead>
                  <TableHead className="text-right text-muted-foreground">Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.summary.temp && (
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: CHART_COLORS.temp }} />
                        Temperature
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{summary.summary.temp.avg}°C</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.temp.min}°C</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.temp.max}°C</TableCell>
                  </TableRow>
                )}
                {summary.summary.humidity && (
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: CHART_COLORS.humidity }} />
                        Humidity
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{summary.summary.humidity.avg}%</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.humidity.min}%</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.humidity.max}%</TableCell>
                  </TableRow>
                )}
                {summary.summary.soilAnalog && (
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: CHART_COLORS.soil }} />
                        Soil (raw)
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{summary.summary.soilAnalog.avg}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.soilAnalog.min}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.soilAnalog.max}</TableCell>
                  </TableRow>
                )}
                {summary.summary.lux && (
                  <TableRow className="border-border/30">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: CHART_COLORS.light }} />
                        Light
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{summary.summary.lux.avg} lux</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.lux.min} lux</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{summary.summary.lux.max} lux</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
