"use client";

import { useState, useEffect } from "react";
import TrendChart from "@/components/TrendChart";
import { soilAnalogToPercent } from "@/lib/thresholds";

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
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                range === r.value
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading data...</div>
      ) : readings.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          No data yet. Connect your ESP32 to start collecting readings.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              data={readings.map((r) => ({ timestamp: r.timestamp, value: r.temp }))}
              label="Temperature"
              color="#f59e0b"
              unit="°C"
            />
            <TrendChart
              data={readings.map((r) => ({ timestamp: r.timestamp, value: r.humidity }))}
              label="Humidity"
              color="#3b82f6"
              unit="%"
            />
            <TrendChart
              data={readings.map((r) => ({
                timestamp: r.timestamp,
                value: soilAnalogToPercent(r.soilAnalog),
              }))}
              label="Soil Moisture"
              color="#8b5cf6"
              unit="%"
            />
            <TrendChart
              data={readings.map((r) => ({ timestamp: r.timestamp, value: r.lux }))}
              label="Light"
              color="#f97316"
              unit="lux"
            />
          </div>

          <TrendChart
            data={readings
              .filter((r) => r.healthScore !== undefined)
              .map((r) => ({ timestamp: r.timestamp, value: r.healthScore }))}
            label="Health Score"
            color="#22c55e"
            unit="%"
          />
        </>
      )}

      {summary && (
        <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Sensor</th>
                  <th className="text-right py-2">Avg</th>
                  <th className="text-right py-2">Min</th>
                  <th className="text-right py-2">Max</th>
                </tr>
              </thead>
              <tbody>
                {summary.summary.temp && (
                  <tr className="border-b border-gray-800/50">
                    <td className="py-2">🌡️ Temperature</td>
                    <td className="text-right">{summary.summary.temp.avg}°C</td>
                    <td className="text-right">{summary.summary.temp.min}°C</td>
                    <td className="text-right">{summary.summary.temp.max}°C</td>
                  </tr>
                )}
                {summary.summary.humidity && (
                  <tr className="border-b border-gray-800/50">
                    <td className="py-2">💧 Humidity</td>
                    <td className="text-right">{summary.summary.humidity.avg}%</td>
                    <td className="text-right">{summary.summary.humidity.min}%</td>
                    <td className="text-right">{summary.summary.humidity.max}%</td>
                  </tr>
                )}
                {summary.summary.soilAnalog && (
                  <tr className="border-b border-gray-800/50">
                    <td className="py-2">🌍 Soil (raw)</td>
                    <td className="text-right">{summary.summary.soilAnalog.avg}</td>
                    <td className="text-right">{summary.summary.soilAnalog.min}</td>
                    <td className="text-right">{summary.summary.soilAnalog.max}</td>
                  </tr>
                )}
                {summary.summary.lux && (
                  <tr className="border-b border-gray-800/50">
                    <td className="py-2">☀️ Light</td>
                    <td className="text-right">{summary.summary.lux.avg} lux</td>
                    <td className="text-right">{summary.summary.lux.min} lux</td>
                    <td className="text-right">{summary.summary.lux.max} lux</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">{summary.count} readings today</p>
        </div>
      )}
    </div>
  );
}
