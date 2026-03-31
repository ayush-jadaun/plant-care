"use client";

import { useState, useEffect } from "react";

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
  { value: "chime", label: "Chime 🔔" },
  { value: "boop", label: "Boop 🎵" },
  { value: "nature", label: "Nature 🌿" },
  { value: "giggle", label: "Giggle 😄" },
];

function RangeInput({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  unit,
}: {
  label: string;
  min: number;
  max: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-800/50">
      <span className="w-32 text-sm text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={min}
          onChange={(e) => onMinChange(Number(e.target.value))}
          className="w-20 bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-green-500/50"
        />
        <span className="text-gray-500 text-sm">to</span>
        <input
          type="number"
          value={max}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="w-20 bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-green-500/50"
        />
        <span className="text-xs text-gray-500">{unit}</span>
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
    return <div className="text-center text-gray-500 py-20">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Plant Identity</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Name</label>
          <input
            type="text"
            value={config.plantName}
            onChange={(e) => setConfig({ ...config, plantName: e.target.value })}
            className="flex-1 bg-gray-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Ideal Ranges</h2>
        <RangeInput
          label="🌡️ Temperature"
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
        />
        <RangeInput
          label="💧 Humidity"
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
        />
        <RangeInput
          label="🌍 Soil Moisture"
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
        />
        <RangeInput
          label="☀️ Light"
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
        />
      </div>

      <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Touch Reaction Sound</h2>
        <div className="grid grid-cols-2 gap-3">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConfig({ ...config, touchSound: opt.value })}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                config.touchSound === opt.value
                  ? "bg-green-600/20 border-2 border-green-500 text-green-300"
                  : "bg-gray-800 border-2 border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium transition-colors"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
