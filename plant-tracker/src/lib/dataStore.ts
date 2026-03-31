import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export interface ReadingEntry {
  timestamp: number;
  temp: number;
  humidity: number;
  soilAnalog: number;
  soilDry: boolean;
  lux: number;
  healthScore: number;
  receivedAt?: number;
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function readDayFile(dateStr: string): ReadingEntry[] {
  const filePath = path.join(DATA_DIR, `${dateStr}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

export function getReadingsForRange(range: string): ReadingEntry[] {
  const now = new Date();
  let days = 1;
  if (range === "7d") days = 7;
  else if (range === "30d") days = 30;

  const allReadings: ReadingEntry[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = getDateString(date);
    const dayData = readDayFile(dateStr);
    allReadings.push(...dayData);
  }

  allReadings.sort((a, b) => a.timestamp - b.timestamp);

  if (range === "30d" && allReadings.length > 0) {
    const sampled: ReadingEntry[] = [allReadings[0]];
    let lastTimestamp = allReadings[0].timestamp;
    for (let i = 1; i < allReadings.length; i++) {
      if (allReadings[i].timestamp - lastTimestamp >= 60) {
        sampled.push(allReadings[i]);
        lastTimestamp = allReadings[i].timestamp;
      }
    }
    return sampled;
  }

  return allReadings;
}

export function getDailySummary(dateStr: string) {
  const readings = readDayFile(dateStr);
  if (readings.length === 0) return null;

  const fields = ["temp", "humidity", "soilAnalog", "lux", "healthScore"] as const;
  const summary: Record<string, { avg: number; min: number; max: number }> = {};

  for (const field of fields) {
    const values = readings.map((r) => r[field] as number).filter((v) => v !== undefined);
    if (values.length === 0) continue;
    summary[field] = {
      avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      min: values.reduce((a, b) => Math.min(a, b), Infinity),
      max: values.reduce((a, b) => Math.max(a, b), -Infinity),
    };
  }

  return { date: dateStr, count: readings.length, summary };
}

export function readConfig() {
  const configPath = path.join(DATA_DIR, "config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

export function writeConfig(config: Record<string, unknown>) {
  const configPath = path.join(DATA_DIR, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
