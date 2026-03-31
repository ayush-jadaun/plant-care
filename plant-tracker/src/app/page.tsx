"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlantSocket } from "@/lib/socket";
import { calculateHealth, soilAnalogToPercent } from "@/lib/thresholds";
import type { HealthResult } from "@/lib/thresholds";
import PlantAvatar from "@/components/PlantAvatar";
import SensorCard from "@/components/SensorCard";
import HealthScore from "@/components/HealthScore";
import AlertBanner from "@/components/AlertBanner";

interface HistoryEntry {
  temp: number;
  humidity: number;
  soilAnalog: number;
  lux: number;
}

export default function DashboardPage() {
  const { sensorData, touchTriggered, connected, resetTouch } = usePlantSocket();
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [plantName, setPlantName] = useState("My Plant");
  const [config, setConfig] = useState<{ thresholds?: any; weights?: any; touchSound?: string } | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.plantName) setPlantName(data.plantName);
        setConfig(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sensorData) return;
    const result = calculateHealth(sensorData, config?.thresholds, config?.weights);
    setHealth(result);
    setHistory((prev) => [...prev.slice(-59), sensorData]);
  }, [sensorData]);

  const handleTouchEnd = useCallback(() => {
    resetTouch();
  }, [resetTouch]);

  if (!connected && !sensorData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <span className="text-6xl mb-4">🌱</span>
        <p className="text-lg">Waiting for plant to connect...</p>
        <p className="text-sm mt-2">Make sure the ESP32 is powered on and connected to the same network.</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-sm text-yellow-500">Listening for sensor data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {health && <AlertBanner alerts={health.alerts} />}

      <div className="flex items-center gap-4 justify-end">
        <button
          onClick={() => setMuted(!muted)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            muted
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-green-500/10 border border-green-500/30 text-green-400"
          }`}
        >
          <span>{muted ? "🔇" : "🔊"}</span>
          {muted ? "Muted" : "Sound On"}
        </button>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-xs text-gray-500">{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      <PlantAvatar
        state={health?.state || "okay"}
        touchTriggered={touchTriggered}
        onTouchAnimationEnd={handleTouchEnd}
        touchSound={config?.touchSound}
        muted={muted}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SensorCard
          label="Temperature"
          value={sensorData ? sensorData.temp.toFixed(1) : "--"}
          unit="°C"
          icon="🌡️"
          score={health?.sensorScores.temp ?? 50}
          history={history.map((h) => h.temp)}
        />
        <SensorCard
          label="Humidity"
          value={sensorData ? sensorData.humidity.toFixed(0) : "--"}
          unit="%"
          icon="💧"
          score={health?.sensorScores.humidity ?? 50}
          history={history.map((h) => h.humidity)}
        />
        <SensorCard
          label="Soil Moisture"
          value={sensorData ? soilAnalogToPercent(sensorData.soilAnalog).toFixed(0) : "--"}
          unit="%"
          icon="🌍"
          score={health?.sensorScores.soilMoisture ?? 50}
          history={history.map((h) => soilAnalogToPercent(h.soilAnalog))}
        />
        <SensorCard
          label="Light"
          value={sensorData ? sensorData.lux.toFixed(0) : "--"}
          unit="lux"
          icon="☀️"
          score={health?.sensorScores.lux ?? 50}
          history={history.map((h) => h.lux)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScore score={health?.score ?? 0} state={health?.state ?? "okay"} />
        {/* Chat panel placeholder — will be added when Gemini integration is complete */}
        <div className="flex flex-col items-center justify-center h-[300px] rounded-2xl bg-gray-900/50 border border-gray-800 text-gray-500">
          <span className="text-4xl mb-3">💬</span>
          <p className="text-sm">Chat with {plantName}</p>
          <p className="text-xs mt-1 text-gray-600">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
