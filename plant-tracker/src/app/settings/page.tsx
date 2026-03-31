"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Leaf, SlidersHorizontal, Music, Save, Check, Loader2 } from "lucide-react";

interface Config {
  plantName: string;
  thresholds: {
    temp: { min: number; max: number };
    humidity: { min: number; max: number };
    soilMoisture: { min: number; max: number };
    lux: { min: number; max: number };
  };
  weights: {
    soilMoisture: number;
    temp: number;
    humidity: number;
    lux: number;
  };
  touchSound: string;
}

const SOUND_OPTIONS = [
  { value: "chime", label: "Chime", icon: "🔔" },
  { value: "boop", label: "Boop", icon: "🎵" },
  { value: "nature", label: "Nature", icon: "🌿" },
  { value: "giggle", label: "Giggle", icon: "😄" },
];

function RangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  unit,
  color,
}: {
  label: string;
  min: number;
  max: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex items-center gap-2.5 w-36">
        <span
          className="size-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <Label className="text-sm text-foreground/80">{label}</Label>
      </div>
      <div className="flex items-center gap-2 flex-1">
        <Input
          type="number"
          value={min}
          onChange={(e) => onMinChange(Number(e.target.value))}
          className="w-20 h-8 bg-secondary/50 border-border/50 text-sm tabular-nums"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="number"
          value={max}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="w-20 h-8 bg-secondary/50 border-border/50 text-sm tabular-nums"
        />
        <span className="text-xs text-muted-foreground font-mono">{unit}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {});
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Settings className="size-4 text-primary" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Leaf className="size-4 text-muted-foreground" />
            Plant Identity
          </CardTitle>
          <CardDescription>Give your plant a name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="plantName" className="text-sm text-muted-foreground shrink-0">
              Name
            </Label>
            <Input
              id="plantName"
              type="text"
              value={config.plantName}
              onChange={(e) => setConfig({ ...config, plantName: e.target.value })}
              className="bg-secondary/50 border-border/50"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Ideal Ranges
          </CardTitle>
          <CardDescription>Set the optimal range for each sensor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <RangeInput
            label="Temperature"
            min={config.thresholds.temp.min}
            max={config.thresholds.temp.max}
            onMinChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, temp: { ...config.thresholds.temp, min: v } },
              })
            }
            onMaxChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, temp: { ...config.thresholds.temp, max: v } },
              })
            }
            unit="°C"
            color="#f59e0b"
          />
          <Separator className="bg-border/30" />
          <RangeInput
            label="Humidity"
            min={config.thresholds.humidity.min}
            max={config.thresholds.humidity.max}
            onMinChange={(v) =>
              setConfig({
                ...config,
                thresholds: {
                  ...config.thresholds,
                  humidity: { ...config.thresholds.humidity, min: v },
                },
              })
            }
            onMaxChange={(v) =>
              setConfig({
                ...config,
                thresholds: {
                  ...config.thresholds,
                  humidity: { ...config.thresholds.humidity, max: v },
                },
              })
            }
            unit="%"
            color="#38bdf8"
          />
          <Separator className="bg-border/30" />
          <RangeInput
            label="Soil Moisture"
            min={config.thresholds.soilMoisture.min}
            max={config.thresholds.soilMoisture.max}
            onMinChange={(v) =>
              setConfig({
                ...config,
                thresholds: {
                  ...config.thresholds,
                  soilMoisture: { ...config.thresholds.soilMoisture, min: v },
                },
              })
            }
            onMaxChange={(v) =>
              setConfig({
                ...config,
                thresholds: {
                  ...config.thresholds,
                  soilMoisture: { ...config.thresholds.soilMoisture, max: v },
                },
              })
            }
            unit="%"
            color="#a78bfa"
          />
          <Separator className="bg-border/30" />
          <RangeInput
            label="Light"
            min={config.thresholds.lux.min}
            max={config.thresholds.lux.max}
            onMinChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, lux: { ...config.thresholds.lux, min: v } },
              })
            }
            onMaxChange={(v) =>
              setConfig({
                ...config,
                thresholds: { ...config.thresholds, lux: { ...config.thresholds.lux, max: v } },
              })
            }
            unit="lux"
            color="#fb923c"
          />
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Music className="size-4 text-muted-foreground" />
            Touch Reaction Sound
          </CardTitle>
          <CardDescription>Sound that plays when you touch the plant sensor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {SOUND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConfig({ ...config, touchSound: opt.value })}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  config.touchSound === opt.value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={save}
        disabled={saving}
        size="lg"
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Check className="size-4" />
            Saved!
          </>
        ) : (
          <>
            <Save className="size-4" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
