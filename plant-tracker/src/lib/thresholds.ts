export interface Thresholds {
  temp: { min: number; max: number };
  humidity: { min: number; max: number };
  soilMoisture: { min: number; max: number };
  lux: { min: number; max: number };
}

export interface Weights {
  soilMoisture: number;
  temp: number;
  humidity: number;
  lux: number;
}

export interface SensorData {
  temp: number;
  humidity: number;
  soilAnalog: number;
  soilDry: boolean;
  lux: number;
  touch: boolean;
  timestamp: number;
}

export interface HealthResult {
  score: number;
  state: "thriving" | "okay" | "stressed" | "critical";
  alerts: string[];
  sensorScores: {
    temp: number;
    humidity: number;
    soilMoisture: number;
    lux: number;
  };
}

const DEFAULT_THRESHOLDS: Thresholds = {
  temp: { min: 18, max: 28 },
  humidity: { min: 40, max: 70 },
  soilMoisture: { min: 40, max: 70 },
  lux: { min: 200, max: 1000 },
};

const DEFAULT_WEIGHTS: Weights = {
  soilMoisture: 0.35,
  temp: 0.25,
  humidity: 0.2,
  lux: 0.2,
};

function sensorScore(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 100;
  if (value < min) {
    const distance = min - value;
    const range = max - min;
    return Math.max(0, 100 - (distance / range) * 100);
  }
  const distance = value - max;
  const range = max - min;
  return Math.max(0, 100 - (distance / range) * 100);
}

// Convert raw analog reading (0-4095 for ESP32) to percentage
// Capacitive sensor: lower reading = more moisture
export function soilAnalogToPercent(raw: number): number {
  const DRY = 3500;
  const WET = 1500;
  const pct = ((DRY - raw) / (DRY - WET)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function getHealthState(score: number): HealthResult["state"] {
  if (score >= 80) return "thriving";
  if (score >= 60) return "okay";
  if (score >= 40) return "stressed";
  return "critical";
}

export function calculateHealth(
  data: SensorData,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  weights: Weights = DEFAULT_WEIGHTS
): HealthResult {
  const soilPercent = soilAnalogToPercent(data.soilAnalog);

  const scores = {
    temp: sensorScore(data.temp, thresholds.temp.min, thresholds.temp.max),
    humidity: sensorScore(data.humidity, thresholds.humidity.min, thresholds.humidity.max),
    soilMoisture: sensorScore(soilPercent, thresholds.soilMoisture.min, thresholds.soilMoisture.max),
    lux: sensorScore(data.lux, thresholds.lux.min, thresholds.lux.max),
  };

  const overall =
    scores.temp * weights.temp +
    scores.humidity * weights.humidity +
    scores.soilMoisture * weights.soilMoisture +
    scores.lux * weights.lux;

  const alerts: string[] = [];

  if (data.soilDry) {
    alerts.push("Water now! Soil is critically dry.");
  }

  if (scores.temp < 50) {
    alerts.push(
      data.temp < thresholds.temp.min
        ? `Too cold! ${data.temp}\u00B0C is below ${thresholds.temp.min}\u00B0C`
        : `Too hot! ${data.temp}\u00B0C is above ${thresholds.temp.max}\u00B0C`
    );
  }

  if (scores.humidity < 50) {
    alerts.push(
      data.humidity < thresholds.humidity.min
        ? `Humidity too low: ${data.humidity}%`
        : `Humidity too high: ${data.humidity}%`
    );
  }

  if (scores.soilMoisture < 50 && !data.soilDry) {
    alerts.push(`Soil moisture is ${soilPercent.toFixed(0)}% \u2014 outside ideal range`);
  }

  if (scores.lux < 50) {
    alerts.push(
      data.lux < thresholds.lux.min
        ? `Too dark! ${data.lux} lux`
        : `Too bright! ${data.lux} lux`
    );
  }

  return {
    score: Math.round(overall),
    state: getHealthState(overall),
    alerts,
    sensorScores: scores,
  };
}
