"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, Sun, Wind, Droplets, Sparkles, RefreshCw } from "lucide-react";

interface Weather {
  current: {
    temp: number | null;
    humidity: number | null;
    windSpeed: number | null;
    cloudCover: number | null;
    precipitation: number | null;
    weatherCode: number | null;
  };
  daily: Array<{
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    precipitation: number;
  }>;
}

interface SensorSnapshot {
  temp: number;
  humidity: number;
  soilMoisture: number;
  lux: number;
  healthScore: number;
}

interface WeatherCardProps {
  sensorData: SensorSnapshot | null;
  plantName: string;
}

function weatherIcon(code: number | null) {
  if (code === null) return Cloud;
  if (code === 0) return Sun;
  if (code < 50) return Cloud;
  return CloudRain;
}

function weatherLabel(code: number | null): string {
  if (code === null) return "Unknown";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Rain showers";
  if (code <= 99) return "Thunderstorm";
  return "Cloudy";
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function WeatherCard({ sensorData, plantName }: WeatherCardProps) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setWeather(data);
      })
      .catch(() => {});
  }, []);

  async function fetchAdvice() {
    if (loadingAdvice || !weather) return;
    setLoadingAdvice(true);
    try {
      const res = await fetch("/api/care-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensorData, weather, plantName }),
      });
      const data = await res.json();
      setAdvice(data.advice || "No advice available.");
    } catch {
      setAdvice("Couldn't fetch advice right now.");
    }
    setLoadingAdvice(false);
  }

  // Auto-fetch advice once weather + sensors are loaded
  useEffect(() => {
    if (weather && sensorData && !advice && !loadingAdvice) {
      fetchAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, sensorData]);

  if (!weather) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          Loading weather for Prayagraj...
        </CardContent>
      </Card>
    );
  }

  const CurrentIcon = weatherIcon(weather.current.weatherCode);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CurrentIcon className="size-4 text-sensor-amber" /> Prayagraj Weather
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={fetchAdvice}
            disabled={loadingAdvice}
            title="Refresh AI advice"
          >
            <RefreshCw className={`size-3.5 ${loadingAdvice ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current weather hero */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-sensor-amber/10 via-transparent to-sensor-blue/10 border border-border/30">
          <CurrentIcon className="size-12 text-sensor-amber" />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{weather.current.temp?.toFixed(0)}°</span>
              <span className="text-sm text-muted-foreground">
                {weatherLabel(weather.current.weatherCode)}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="size-3" /> {weather.current.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="size-3" /> {weather.current.windSpeed} km/h
              </span>
              <span className="flex items-center gap-1">
                <Cloud className="size-3" /> {weather.current.cloudCover}%
              </span>
            </div>
          </div>
        </div>

        {/* 3-day forecast */}
        <div className="grid grid-cols-3 gap-2">
          {weather.daily.slice(0, 3).map((d) => {
            const Icon = weatherIcon(d.weatherCode);
            return (
              <div
                key={d.date}
                className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {dayName(d.date)}
                </div>
                <Icon className="size-5 mx-auto my-1.5 text-sensor-amber" />
                <div className="text-xs font-semibold">
                  {d.tempMax.toFixed(0)}° / {d.tempMin.toFixed(0)}°
                </div>
                {d.precipitation > 0 && (
                  <div className="text-[10px] text-sensor-blue mt-0.5 flex items-center justify-center gap-0.5">
                    <Droplets className="size-2.5" />
                    {d.precipitation.toFixed(1)}mm
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Care Advice */}
        <div className="p-3 rounded-xl bg-sensor-green/5 border border-sensor-green/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-3.5 text-sensor-green" />
            <span className="text-xs font-semibold text-sensor-green uppercase tracking-wide">
              AI Care Tips
            </span>
          </div>
          {loadingAdvice && !advice ? (
            <div className="text-xs text-muted-foreground animate-pulse">
              Thinking about your plant's care...
            </div>
          ) : advice ? (
            <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
              {advice}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Tap refresh for care tips</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
