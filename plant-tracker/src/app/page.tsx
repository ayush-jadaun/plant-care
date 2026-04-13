"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlantSocket } from "@/lib/socket";
import { calculateHealth, soilAnalogToPercent } from "@/lib/thresholds";
import type { HealthResult } from "@/lib/thresholds";
import PlantAvatar from "@/components/PlantAvatar";
import SensorCard from "@/components/SensorCard";
import HealthScore from "@/components/HealthScore";
import AlertBanner from "@/components/AlertBanner";
import ChatPanel from "@/components/ChatPanel";
import WeatherCard from "@/components/WeatherCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX, Wifi, WifiOff, Leaf } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-sm w-full">
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-5">
              <Leaf className="size-8 text-primary" />
            </div>
            <p className="text-base font-medium text-foreground">Waiting for plant to connect...</p>
            <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed">
              Make sure the ESP32 is powered on and connected to the same network.
            </p>
            <Badge variant="outline" className="mt-5 gap-1.5 border-sensor-amber/30 text-sensor-amber bg-sensor-amber/5">
              <span className="size-1.5 rounded-full bg-sensor-amber animate-pulse" />
              Listening for sensor data
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {health && <AlertBanner alerts={health.alerts} />}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">{plantName}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMuted(!muted)}
            className={
              muted
                ? "border-sensor-rose/20 text-sensor-rose hover:bg-sensor-rose/10 hover:text-sensor-rose"
                : "border-sensor-green/20 text-sensor-green hover:bg-sensor-green/10 hover:text-sensor-green"
            }
          >
            {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            {muted ? "Muted" : "Sound"}
          </Button>
          <Badge
            variant="outline"
            className={
              connected
                ? "gap-1.5 border-sensor-green/20 text-sensor-green bg-sensor-green/5"
                : "gap-1.5 border-sensor-rose/20 text-sensor-rose bg-sensor-rose/5"
            }
          >
            {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      <PlantAvatar
        state={health?.state || "okay"}
        touchTriggered={touchTriggered}
        onTouchAnimationEnd={handleTouchEnd}
        touchSound={config?.touchSound}
        muted={muted}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HealthScore score={health?.score ?? 0} state={health?.state ?? "okay"} />
        <WeatherCard
          sensorData={
            sensorData && health
              ? {
                  temp: sensorData.temp,
                  humidity: sensorData.humidity,
                  soilMoisture: soilAnalogToPercent(sensorData.soilAnalog),
                  lux: sensorData.lux,
                  healthScore: health.score,
                }
              : null
          }
          plantName={plantName}
        />
      </div>

      <ChatPanel sensorData={sensorData} healthResult={health} plantName={plantName} />
    </div>
  );
}
