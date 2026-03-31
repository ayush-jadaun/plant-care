# Plant Health & Status Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive plant health monitoring system with ESP32 sensors, a Next.js + Socket.io real-time dashboard, animated plant avatar, and Gemini-powered plant chatbot.

**Architecture:** ESP32 reads sensors and pushes JSON data via WebSocket to a Next.js custom server on the laptop. The server persists data to daily JSON files and broadcasts to browser clients via Socket.io. The React dashboard renders an animated plant avatar, sensor cards, health score, alerts, analytics charts, and a Gemini chatbot.

**Tech Stack:** Arduino C++ (ESP32), Next.js 14 (App Router), Socket.io, Recharts, Gemini API, TypeScript, CSS animations, JSON file storage.

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `plant-tracker/package.json`
- Create: `plant-tracker/tsconfig.json`
- Create: `plant-tracker/.env.local`
- Create: `plant-tracker/next.config.js`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd E:/microcontroller
npx create-next-app@latest plant-tracker --typescript --app --tailwind --eslint --src-dir --no-import-alias
```

Select defaults when prompted.

- [ ] **Step 2: Install dependencies**

```bash
cd E:/microcontroller/plant-tracker
npm install socket.io socket.io-client recharts @google/generative-ai
npm install -D @types/node
```

- [ ] **Step 3: Create .env.local with Gemini API key placeholder**

Create `plant-tracker/.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 4: Create data directories**

```bash
mkdir -p E:/microcontroller/plant-tracker/data/touches
mkdir -p E:/microcontroller/plant-tracker/data/chats
mkdir -p E:/microcontroller/plant-tracker/data/archive
mkdir -p E:/microcontroller/plant-tracker/public/sounds
```

- [ ] **Step 5: Create default config.json**

Create `plant-tracker/data/config.json`:
```json
{
  "plantName": "My Plant",
  "thresholds": {
    "temp": { "min": 18, "max": 28 },
    "humidity": { "min": 40, "max": 70 },
    "soilMoisture": { "min": 40, "max": 70 },
    "lux": { "min": 200, "max": 1000 }
  },
  "weights": {
    "soilMoisture": 0.35,
    "temp": 0.25,
    "humidity": 0.20,
    "lux": 0.20
  },
  "touchSound": "chime"
}
```

- [ ] **Step 6: Verify project runs**

```bash
cd E:/microcontroller/plant-tracker
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Custom Server with Socket.io

**Files:**
- Create: `plant-tracker/server.js`
- Modify: `plant-tracker/package.json` (add dev:server script)

- [ ] **Step 1: Write server.js**

Create `plant-tracker/server.js`:
```js
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const DATA_DIR = path.join(__dirname, "data");

function getTodayFileName() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.json`;
}

function appendToFile(dir, fileName, entry) {
  const dirPath = path.join(DATA_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, fileName);
  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      data = [];
    }
  }
  data.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function appendReading(entry) {
  const filePath = path.join(DATA_DIR, getTodayFileName());
  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      data = [];
    }
  }
  data.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(data));
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  let latestReading = null;

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send latest reading to newly connected browser clients
    if (latestReading) {
      socket.emit("sensorData", latestReading);
    }

    // ESP32 sends sensor data
    socket.on("sensorData", (data) => {
      console.log("Sensor data received:", data);
      latestReading = data;
      appendReading({ ...data, receivedAt: Date.now() });
      // Broadcast to all browser clients
      io.emit("sensorData", data);
    });

    // ESP32 sends touch event
    socket.on("touchEvent", (data) => {
      console.log("Touch event received:", data);
      appendToFile("touches", getTodayFileName(), {
        timestamp: data.timestamp || Date.now(),
      });
      // Broadcast to all browser clients
      io.emit("touchEvent", data);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Plant Tracker running on http://${hostname}:${port}`);
  });
});
```

- [ ] **Step 2: Update package.json scripts**

In `plant-tracker/package.json`, replace the `"dev"` script:
```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js",
    "lint": "next lint"
  }
}
```

- [ ] **Step 3: Run and verify server starts**

```bash
cd E:/microcontroller/plant-tracker
npm run dev
```

Expected: `> Plant Tracker running on http://0.0.0.0:3000`

- [ ] **Step 4: Commit**

```bash
git add server.js package.json
git commit -m "feat: add custom server with Socket.io for real-time sensor data"
```

---

## Task 3: Health Score Calculation Library

**Files:**
- Create: `plant-tracker/src/lib/thresholds.ts`

- [ ] **Step 1: Write the health score calculation module**

Create `plant-tracker/src/lib/thresholds.ts`:
```ts
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
  // value > max
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

  // D0 emergency override
  if (data.soilDry) {
    alerts.push("Water now! Soil is critically dry.");
  }

  if (scores.temp < 50) {
    alerts.push(
      data.temp < thresholds.temp.min
        ? `Too cold! ${data.temp}°C is below ${thresholds.temp.min}°C`
        : `Too hot! ${data.temp}°C is above ${thresholds.temp.max}°C`
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
    alerts.push(`Soil moisture is ${soilPercent.toFixed(0)}% — outside ideal range`);
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd E:/microcontroller/plant-tracker
npx tsc --noEmit src/lib/thresholds.ts
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/thresholds.ts
git commit -m "feat: add health score calculation with weighted sensor scoring"
```

---

## Task 4: Data Storage API Routes

**Files:**
- Create: `plant-tracker/src/lib/dataStore.ts`
- Create: `plant-tracker/src/app/api/readings/route.ts`
- Create: `plant-tracker/src/app/api/summary/route.ts`
- Create: `plant-tracker/src/app/api/config/route.ts`

- [ ] **Step 1: Write dataStore.ts utility**

Create `plant-tracker/src/lib/dataStore.ts`:
```ts
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

  // Sort by timestamp ascending
  allReadings.sort((a, b) => a.timestamp - b.timestamp);

  // For 30d range, sample to 1 reading per minute to reduce payload
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
      min: Math.min(...values),
      max: Math.max(...values),
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
```

- [ ] **Step 2: Write GET /api/readings route**

Create `plant-tracker/src/app/api/readings/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getReadingsForRange } from "@/lib/dataStore";

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") || "24h";
  if (!["24h", "7d", "30d"].includes(range)) {
    return NextResponse.json({ error: "Invalid range. Use 24h, 7d, or 30d" }, { status: 400 });
  }
  const readings = getReadingsForRange(range);
  return NextResponse.json(readings);
}
```

- [ ] **Step 3: Write GET /api/summary route**

Create `plant-tracker/src/app/api/summary/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getDailySummary } from "@/lib/dataStore";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Provide date as YYYY-MM-DD" }, { status: 400 });
  }
  const summary = getDailySummary(date);
  if (!summary) {
    return NextResponse.json({ error: "No data for this date" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
```

- [ ] **Step 4: Write GET/PUT /api/config route**

Create `plant-tracker/src/app/api/config/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/dataStore";

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  writeConfig(body);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Verify build**

```bash
cd E:/microcontroller/plant-tracker
npm run build
```

Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/lib/dataStore.ts src/app/api/
git commit -m "feat: add data storage layer and API routes for readings, summary, config"
```

---

## Task 5: Gemini Chat API Route

**Files:**
- Create: `plant-tracker/src/lib/gemini.ts`
- Create: `plant-tracker/src/app/api/chat/route.ts`

- [ ] **Step 1: Write Gemini client library**

Create `plant-tracker/src/lib/gemini.ts`:
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface PlantContext {
  plantName: string;
  temp: number;
  humidity: number;
  soilMoisture: number;
  lux: number;
  healthScore: number;
  healthState: string;
  alerts: string[];
}

function buildSystemPrompt(context: PlantContext): string {
  return `You are ${context.plantName}, a real living plant with sensors attached to you. You have a fun, dramatic, sassy personality. You speak in first person as the plant.

Current sensor data:
- Temperature: ${context.temp}°C
- Humidity: ${context.humidity}%
- Soil Moisture: ${context.soilMoisture}%
- Light: ${context.lux} lux
- Health Score: ${context.healthScore}%
- Health State: ${context.healthState}
- Active Alerts: ${context.alerts.length > 0 ? context.alerts.join(", ") : "None"}

Respond based on how you're actually feeling (your sensor data). If you're thirsty, complain dramatically. If you're thriving, be happy and grateful. Keep responses short (1-3 sentences), fun, and in character. Use plant puns when possible.`;
}

export async function chatWithPlant(
  message: string,
  context: PlantContext,
  history: { role: string; content: string }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const systemPrompt = buildSystemPrompt(context);

  const chatHistory = history.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }],
  }));

  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: `Hey there! I'm ${context.plantName}! What's up? 🌱` }] },
      ...chatHistory,
    ],
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
}
```

- [ ] **Step 2: Write POST /api/chat route**

Create `plant-tracker/src/app/api/chat/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { chatWithPlant, PlantContext } from "@/lib/gemini";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function getTodayFileName(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.json`;
}

function getChatHistory(): { role: string; content: string }[] {
  const chatDir = path.join(DATA_DIR, "chats");
  if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
  const filePath = path.join(chatDir, getTodayFileName());
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function saveChatMessage(role: string, content: string) {
  const chatDir = path.join(DATA_DIR, "chats");
  if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
  const filePath = path.join(chatDir, getTodayFileName());
  const history = getChatHistory();
  history.push({ role, content, timestamp: Date.now() } as { role: string; content: string });
  fs.writeFileSync(filePath, JSON.stringify(history));
}

export async function POST(req: NextRequest) {
  const { message, context }: { message: string; context: PlantContext } = await req.json();

  if (!message || !context) {
    return NextResponse.json({ error: "message and context are required" }, { status: 400 });
  }

  try {
    const history = getChatHistory();
    const response = await chatWithPlant(message, context, history);
    saveChatMessage("user", message);
    saveChatMessage("model", response);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Failed to chat with plant", response: "Hmm, my leaves are tingling... I can't think straight right now. Try again?" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify build**

```bash
cd E:/microcontroller/plant-tracker
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/gemini.ts src/app/api/chat/
git commit -m "feat: add Gemini-powered plant chatbot API with personality and sensor context"
```

---

## Task 6: Socket.io Client Hook

**Files:**
- Create: `plant-tracker/src/lib/socket.ts`

- [ ] **Step 1: Write Socket.io client hook**

Create `plant-tracker/src/lib/socket.ts`:
```ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { SensorData } from "./thresholds";

export interface UsePlantSocketReturn {
  sensorData: SensorData | null;
  touchTriggered: boolean;
  connected: boolean;
  resetTouch: () => void;
}

export function usePlantSocket(): UsePlantSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [touchTriggered, setTouchTriggered] = useState(false);
  const [connected, setConnected] = useState(false);

  const resetTouch = useCallback(() => {
    setTouchTriggered(false);
  }, []);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to plant server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from plant server");
      setConnected(false);
    });

    socket.on("sensorData", (data: SensorData) => {
      setSensorData(data);
    });

    socket.on("touchEvent", () => {
      setTouchTriggered(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { sensorData, touchTriggered, connected, resetTouch };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/socket.ts
git commit -m "feat: add Socket.io client hook for real-time sensor data"
```

---

## Task 7: SensorCard Component

**Files:**
- Create: `plant-tracker/src/components/SensorCard.tsx`

- [ ] **Step 1: Write SensorCard component**

Create `plant-tracker/src/components/SensorCard.tsx`:
```tsx
"use client";

interface SensorCardProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
  score: number; // 0-100, determines color
  history: number[]; // last N values for sparkline
}

function getStatusColor(score: number): string {
  if (score >= 70) return "#22c55e"; // green
  if (score >= 40) return "#eab308"; // yellow
  return "#ef4444"; // red
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 40;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="mt-2">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SensorCard({ label, value, unit, icon, score, history }: SensorCardProps) {
  const color = getStatusColor(score);

  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `2px solid ${color}40`,
        boxShadow: `0 4px 24px ${color}15`,
      }}
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold mt-1" style={{ color }}>
        {value}
        <span className="text-lg font-normal ml-1">{unit}</span>
      </span>
      <Sparkline data={history} color={color} />
      <div
        className="mt-2 w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: `${color}20` }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SensorCard.tsx
git commit -m "feat: add SensorCard component with sparkline and color-coded status"
```

---

## Task 8: HealthScore Component

**Files:**
- Create: `plant-tracker/src/components/HealthScore.tsx`

- [ ] **Step 1: Write HealthScore gauge component**

Create `plant-tracker/src/components/HealthScore.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";

interface HealthScoreProps {
  score: number;
  state: "thriving" | "okay" | "stressed" | "critical";
}

const stateColors = {
  thriving: "#22c55e",
  okay: "#84cc16",
  stressed: "#eab308",
  critical: "#ef4444",
};

const stateLabels = {
  thriving: "Thriving!",
  okay: "Doing Okay",
  stressed: "Stressed",
  critical: "Critical!",
};

export default function HealthScore({ score, state }: HealthScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = stateColors[state];

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  // SVG arc for gauge
  const radius = 60;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Background arc */}
        <path
          d="M 20 90 A 60 60 0 0 1 140 90"
          fill="none"
          stroke="#1f2937"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 20 90 A 60 60 0 0 1 140 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <span
        className="text-4xl font-bold -mt-4 transition-colors duration-500"
        style={{ color }}
      >
        {animatedScore}%
      </span>
      <span className="text-sm mt-1" style={{ color }}>
        {stateLabels[state]}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HealthScore.tsx
git commit -m "feat: add animated HealthScore gauge component"
```

---

## Task 9: AlertBanner Component

**Files:**
- Create: `plant-tracker/src/components/AlertBanner.tsx`

- [ ] **Step 1: Write AlertBanner component**

Create `plant-tracker/src/components/AlertBanner.tsx`:
```tsx
"use client";

interface AlertBannerProps {
  alerts: string[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="w-full">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse"
        >
          <span className="text-xl">&#9888;</span>
          <span className="text-sm font-medium">{alert}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AlertBanner.tsx
git commit -m "feat: add AlertBanner component for threshold warnings"
```

---

## Task 10: Plant Avatar Component

**Files:**
- Create: `plant-tracker/src/components/PlantAvatar.tsx`

- [ ] **Step 1: Write the animated PlantAvatar component**

Create `plant-tracker/src/components/PlantAvatar.tsx`:
```tsx
"use client";

import { useEffect, useState, useRef } from "react";

interface PlantAvatarProps {
  state: "thriving" | "okay" | "stressed" | "critical";
  touchTriggered: boolean;
  onTouchAnimationEnd: () => void;
}

const TOUCH_PHRASES = [
  "Hey! That tickles! 🌿",
  "Ooh, gentle please! 🌱",
  "I'm photosynthesizing here! ☀️",
  "Do I look like a petting zoo? 🌵",
  "That's my good leaf! 💚",
  "Whee! Do it again! 🎉",
  "Watch the stems, buddy! 🌾",
  "I felt that in my roots! 🌳",
];

const NOTE_SYMBOLS = ["♪", "♫", "♬", "♩"];

export default function PlantAvatar({ state, touchTriggered, onTouchAnimationEnd }: PlantAvatarProps) {
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [showTouch, setShowTouch] = useState(false);
  const touchSoundRef = useRef<HTMLAudioElement | null>(null);
  const [floatingNotes, setFloatingNotes] = useState<{ id: number; x: number; symbol: string }[]>([]);
  const noteIdRef = useRef(0);

  // Touch reaction
  useEffect(() => {
    if (touchTriggered) {
      const phrase = TOUCH_PHRASES[Math.floor(Math.random() * TOUCH_PHRASES.length)];
      setSpeechBubble(phrase);
      setShowTouch(true);

      // Play sound
      try {
        touchSoundRef.current = new Audio("/sounds/chime.mp3");
        touchSoundRef.current.volume = 0.5;
        touchSoundRef.current.play().catch(() => {});
      } catch {}

      const timer = setTimeout(() => {
        setSpeechBubble(null);
        setShowTouch(false);
        onTouchAnimationEnd();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [touchTriggered, onTouchAnimationEnd]);

  // Floating music notes when thriving
  useEffect(() => {
    if (state !== "thriving") {
      setFloatingNotes([]);
      return;
    }
    const interval = setInterval(() => {
      const id = noteIdRef.current++;
      const x = 30 + Math.random() * 40;
      const symbol = NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)];
      setFloatingNotes((prev) => [...prev.slice(-5), { id, x, symbol }]);
    }, 1500);
    return () => clearInterval(interval);
  }, [state]);

  const plantEmoji = {
    thriving: "🌿",
    okay: "🌱",
    stressed: "🥀",
    critical: "🍂",
  }[state];

  const faceEmoji = {
    thriving: "😊",
    okay: "😌",
    stressed: "😟",
    critical: "😫",
  }[state];

  const glowColor = {
    thriving: "rgba(34, 197, 94, 0.4)",
    okay: "rgba(132, 204, 22, 0.2)",
    stressed: "rgba(234, 179, 8, 0.2)",
    critical: "rgba(239, 68, 68, 0.3)",
  }[state];

  const animationClass = {
    thriving: "animate-bounce-slow",
    okay: "animate-sway",
    stressed: "animate-droop",
    critical: "animate-shiver",
  }[state];

  return (
    <div className="relative flex flex-col items-center py-8">
      {/* Floating music notes */}
      {floatingNotes.map((note) => (
        <span
          key={note.id}
          className="absolute text-2xl text-green-400 animate-float-up pointer-events-none"
          style={{ left: `${note.x}%`, bottom: "70%" }}
        >
          {note.symbol}
        </span>
      ))}

      {/* Speech bubble */}
      {speechBubble && (
        <div className="absolute -top-2 bg-white text-gray-900 px-4 py-2 rounded-2xl rounded-bl-sm text-sm font-medium shadow-lg animate-pop-in z-10 max-w-[250px] text-center">
          {speechBubble}
        </div>
      )}

      {/* Plant container with glow */}
      <div
        className={`relative text-center ${animationClass} ${showTouch ? "animate-wiggle" : ""}`}
        style={{
          filter: `drop-shadow(0 0 30px ${glowColor})`,
          transition: "filter 1s ease",
        }}
      >
        {/* Pot */}
        <div className="relative">
          <span className="text-8xl select-none">{plantEmoji}</span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-4xl select-none">
            🪴
          </span>
        </div>
        {/* Face */}
        <div className="mt-2 text-3xl">{faceEmoji}</div>
      </div>

      {/* State label */}
      <span
        className="mt-4 text-sm font-medium uppercase tracking-widest"
        style={{
          color: glowColor.replace("0.4", "1").replace("0.2", "1").replace("0.3", "1"),
        }}
      >
        {state}
      </span>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          75% { transform: rotate(-2deg); }
        }
        @keyframes droop {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(3px); }
        }
        @keyframes shiver {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-10deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-5deg); }
          80% { transform: rotate(5deg); }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-80px) scale(1.5); }
        }
        @keyframes pop-in {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-sway { animation: sway 4s ease-in-out infinite; }
        .animate-droop { animation: droop 5s ease-in-out infinite; }
        .animate-shiver { animation: shiver 0.3s ease-in-out infinite; }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out; }
        .animate-float-up { animation: float-up 2s ease-out forwards; }
        .animate-pop-in { animation: pop-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Add a placeholder sound file**

```bash
# We'll need a real chime.mp3 later — for now create the directory
mkdir -p E:/microcontroller/plant-tracker/public/sounds
```

Note: Download a short chime sound effect (MP3, ~1 second) and save as `public/sounds/chime.mp3`. Free options at freesound.org or pixabay.com/sound-effects.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlantAvatar.tsx
git commit -m "feat: add animated PlantAvatar with state-based animations and touch reactions"
```

---

## Task 11: ChatPanel Component

**Files:**
- Create: `plant-tracker/src/components/ChatPanel.tsx`

- [ ] **Step 1: Write ChatPanel component**

Create `plant-tracker/src/components/ChatPanel.tsx`:
```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { HealthResult, SensorData } from "@/lib/thresholds";
import { soilAnalogToPercent } from "@/lib/thresholds";

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface ChatPanelProps {
  sensorData: SensorData | null;
  healthResult: HealthResult | null;
  plantName: string;
}

export default function ChatPanel({ sensorData, healthResult, plantName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading || !sensorData || !healthResult) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: {
            plantName,
            temp: sensorData.temp,
            humidity: sensorData.humidity,
            soilMoisture: soilAnalogToPercent(sensorData.soilAnalog),
            lux: sensorData.lux,
            healthScore: healthResult.score,
            healthState: healthResult.state,
            alerts: healthResult.alerts,
          },
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "model", content: data.response || "..." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", content: "My roots are tangled... try again? 🌱" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[400px] rounded-2xl bg-gray-900/50 border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <span className="text-lg">💬</span>
        <span className="text-sm font-medium text-gray-300">
          Chat with {plantName}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            Say hi to {plantName}! 🌱
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-green-600/20 text-green-100 rounded-br-sm"
                  : "bg-gray-800 text-gray-200 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 px-4 py-2 rounded-2xl rounded-bl-sm text-sm">
              <span className="animate-pulse">thinking with my leaves...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Talk to ${plantName}...`}
          className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/50 placeholder:text-gray-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatPanel.tsx
git commit -m "feat: add ChatPanel component with Gemini-powered plant personality"
```

---

## Task 12: Dashboard Page (Live View)

**Files:**
- Create: `plant-tracker/src/app/page.tsx`
- Modify: `plant-tracker/src/app/layout.tsx`
- Create: `plant-tracker/src/app/globals.css` (extend with dark theme)

- [ ] **Step 1: Write the layout with dark theme and navigation**

Overwrite `plant-tracker/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plant Tracker",
  description: "Interactive plant health monitoring dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="text-lg font-bold flex items-center gap-2">
            🌱 Plant Tracker
          </span>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/analytics" className="text-sm text-gray-400 hover:text-white transition-colors">
            Analytics
          </Link>
          <Link href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
            Settings
          </Link>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write the Dashboard page**

Overwrite `plant-tracker/src/app/page.tsx`:
```tsx
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

  // Load config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((config) => {
        if (config.plantName) setPlantName(config.plantName);
      })
      .catch(() => {});
  }, []);

  // Calculate health when sensor data changes
  useEffect(() => {
    if (!sensorData) return;
    const result = calculateHealth(sensorData);
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
      {/* Alerts */}
      {health && <AlertBanner alerts={health.alerts} />}

      {/* Connection status */}
      <div className="flex items-center gap-2 justify-end">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-xs text-gray-500">{connected ? "Connected" : "Disconnected"}</span>
      </div>

      {/* Plant Avatar */}
      <PlantAvatar
        state={health?.state || "okay"}
        touchTriggered={touchTriggered}
        onTouchAnimationEnd={handleTouchEnd}
      />

      {/* Sensor Cards */}
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

      {/* Bottom row: Health Score + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScore score={health?.score ?? 0} state={health?.state ?? "okay"} />
        <ChatPanel sensorData={sensorData} healthResult={health} plantName={plantName} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it builds**

```bash
cd E:/microcontroller/plant-tracker
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add dashboard page with live sensor cards, avatar, health score, and chat"
```

---

## Task 13: Analytics Page

**Files:**
- Create: `plant-tracker/src/components/TrendChart.tsx`
- Create: `plant-tracker/src/app/analytics/page.tsx`

- [ ] **Step 1: Write TrendChart component**

Create `plant-tracker/src/components/TrendChart.tsx`:
```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendChartProps {
  data: { timestamp: number; value: number }[];
  label: string;
  color: string;
  unit: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TrendChart({ data, label, color, unit }: TrendChartProps) {
  const isMultiDay = data.length > 0 &&
    data[data.length - 1].timestamp - data[0].timestamp > 86400;

  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={isMultiDay ? formatDate : formatTime}
            stroke="#4b5563"
            tick={{ fontSize: 11 }}
          />
          <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            labelFormatter={(val) => {
              const d = new Date(Number(val) * 1000);
              return d.toLocaleString();
            }}
            formatter={(val: number) => [`${val.toFixed(1)} ${unit}`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Write Analytics page**

Create `plant-tracker/src/app/analytics/page.tsx`:
```tsx
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

  // Load today's summary
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

          {/* Health Score trend */}
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

      {/* Daily Summary */}
      {summary && (
        <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
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
```

- [ ] **Step 3: Verify build**

```bash
cd E:/microcontroller/plant-tracker
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/TrendChart.tsx src/app/analytics/
git commit -m "feat: add analytics page with trend charts and daily summary"
```

---

## Task 14: Settings Page

**Files:**
- Create: `plant-tracker/src/app/settings/page.tsx`

- [ ] **Step 1: Write Settings page**

Create `plant-tracker/src/app/settings/page.tsx`:
```tsx
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

      {/* Plant Name */}
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

      {/* Thresholds */}
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

      {/* Touch Sound */}
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

      {/* Save button */}
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
```

- [ ] **Step 2: Verify build**

```bash
cd E:/microcontroller/plant-tracker
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/
git commit -m "feat: add settings page with configurable thresholds, plant name, and touch sound"
```

---

## Task 15: ESP32 Firmware

**Files:**
- Modify: `sketch_mar31a/sketch_mar31a.ino`

- [ ] **Step 1: Write the complete ESP32 firmware**

Overwrite `E:/microcontroller/sketch_mar31a/sketch_mar31a.ino`:
```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>

// ============ CONFIGURATION ============
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SERVER_IP     "192.168.1.100"  // Your laptop's IP on the network
#define SERVER_PORT   3000

// ============ PIN DEFINITIONS ============
#define DHT_PIN       4       // DHT22 data pin
#define DHT_TYPE      DHT22
#define TOUCH_PIN     15      // TTP223 signal pin (interrupt-capable)
#define SOIL_AO_PIN   34      // Soil sensor analog output (ADC1)
#define SOIL_DO_PIN   16      // Soil sensor digital output
// BH1750: SDA = GPIO 21, SCL = GPIO 22 (default I2C)

// ============ TIMING ============
#define SENSOR_INTERVAL 5000  // Read sensors every 5 seconds
#define RECONNECT_INTERVAL 5000

// ============ OBJECTS ============
DHT dht(DHT_PIN, DHT_TYPE);
BH1750 lightMeter;
WebSocketsClient webSocket;

// ============ STATE ============
volatile bool touchDetected = false;
unsigned long lastSensorRead = 0;
unsigned long lastReconnect = 0;
bool wsConnected = false;

// Touch interrupt handler
void IRAM_ATTR onTouch() {
  touchDetected = true;
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Plant Health Tracker ===");

  // Pin setup
  pinMode(TOUCH_PIN, INPUT);
  pinMode(SOIL_DO_PIN, INPUT);

  // Attach touch interrupt
  attachInterrupt(digitalPinToInterrupt(TOUCH_PIN), onTouch, RISING);

  // Initialize sensors
  dht.begin();
  Wire.begin();
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 initialized");
  } else {
    Serial.println("BH1750 init failed!");
  }

  // Connect to WiFi
  connectWiFi();

  // Connect WebSocket
  webSocket.begin(SERVER_IP, SERVER_PORT, "/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(RECONNECT_INTERVAL);
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connection failed! Restarting...");
    ESP.restart();
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket disconnected");
      wsConnected = false;
      break;
    case WStype_CONNECTED:
      Serial.println("WebSocket connected to server");
      wsConnected = true;
      break;
    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      break;
  }
}

void sendSensorData() {
  // Read DHT22
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Read BH1750
  float lux = lightMeter.readLightLevel();

  // Read soil sensor
  int soilAnalog = analogRead(SOIL_AO_PIN);
  bool soilDry = digitalRead(SOIL_DO_PIN) == HIGH;

  // Validate readings
  if (isnan(temp) || isnan(humidity)) {
    Serial.println("DHT read failed, skipping...");
    return;
  }

  // Build JSON
  StaticJsonDocument<256> doc;
  doc["temp"] = round(temp * 10.0) / 10.0;
  doc["humidity"] = round(humidity * 10.0) / 10.0;
  doc["soilAnalog"] = soilAnalog;
  doc["soilDry"] = soilDry;
  doc["lux"] = round(lux * 10.0) / 10.0;
  doc["touch"] = false;
  doc["timestamp"] = millis() / 1000;  // Uptime in seconds

  String jsonStr;
  serializeJson(doc, jsonStr);

  // Socket.io message format: 42["sensorData",{...}]
  String socketMsg = "42[\"sensorData\"," + jsonStr + "]";

  if (wsConnected) {
    webSocket.sendTXT(socketMsg);
    Serial.printf("Sent: T=%.1f H=%.1f S=%d L=%.1f\n", temp, humidity, soilAnalog, lux);
  } else {
    Serial.println("Not connected, data not sent");
  }
}

void sendTouchEvent() {
  StaticJsonDocument<64> doc;
  doc["event"] = "touch";
  doc["timestamp"] = millis() / 1000;

  String jsonStr;
  serializeJson(doc, jsonStr);

  String socketMsg = "42[\"touchEvent\"," + jsonStr + "]";

  if (wsConnected) {
    webSocket.sendTXT(socketMsg);
    Serial.println("Touch event sent!");
  }
}

void loop() {
  webSocket.loop();

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    connectWiFi();
  }

  // Handle touch event (from interrupt)
  if (touchDetected) {
    touchDetected = false;
    sendTouchEvent();
    delay(500);  // Debounce
  }

  // Regular sensor readings
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    sendSensorData();
  }
}
```

- [ ] **Step 2: Note required Arduino libraries**

Install these libraries in Arduino IDE (Sketch > Include Library > Manage Libraries):
- `WebSockets` by Markus Sattler (for WebSocketsClient)
- `ArduinoJson` by Benoit Blanchon (v6)
- `DHT sensor library` by Adafruit
- `Adafruit Unified Sensor` (dependency of DHT)
- `BH1750` by Christopher Laws

- [ ] **Step 3: Update configuration**

Before uploading, update these `#define` values in the sketch:
- `WIFI_SSID` — your WiFi network name
- `WIFI_PASSWORD` — your WiFi password
- `SERVER_IP` — your laptop's IP address (find with `ipconfig` on Windows)

- [ ] **Step 4: Verify sketch compiles**

In Arduino IDE:
1. Select Board: ESP32 Dev Module
2. Click Verify (checkmark button)

Expected: Compiles without errors

- [ ] **Step 5: Commit**

```bash
git add sketch_mar31a/sketch_mar31a.ino
git commit -m "feat: add ESP32 firmware with all sensors, WiFi, WebSocket, and touch interrupt"
```

---

## Task 16: Integration Test — Full System Smoke Test

- [ ] **Step 1: Start the Next.js server**

```bash
cd E:/microcontroller/plant-tracker
npm run dev
```

Expected: `> Plant Tracker running on http://0.0.0.0:3000`

- [ ] **Step 2: Open dashboard in browser**

Navigate to `http://localhost:3000`

Expected: See the "Waiting for plant to connect..." screen with the plant emoji and pulsing indicator.

- [ ] **Step 3: Test with simulated data (no ESP32 needed)**

Open browser console and run:
```js
const { io } = await import("/socket.io/socket.io.esm.min.js");
const socket = io();
socket.emit("sensorData", {
  temp: 25.3,
  humidity: 60.1,
  soilAnalog: 2000,
  soilDry: false,
  lux: 450.5,
  touch: false,
  timestamp: Math.floor(Date.now() / 1000)
});
```

Expected: Dashboard updates with sensor values, plant avatar shows "thriving" state.

- [ ] **Step 4: Test touch event**

In browser console:
```js
socket.emit("touchEvent", { event: "touch", timestamp: Math.floor(Date.now() / 1000) });
```

Expected: Plant avatar wiggles, speech bubble appears, sound plays.

- [ ] **Step 5: Test analytics page**

Navigate to `http://localhost:3000/analytics`

Expected: Shows trend charts with the simulated data point(s).

- [ ] **Step 6: Test settings page**

Navigate to `http://localhost:3000/settings`

Expected: Shows settings form with default values. Change plant name, save, verify it persists.

- [ ] **Step 7: Test chat (requires Gemini API key)**

Set your real Gemini API key in `.env.local`, restart server. Type a message in the chat panel.

Expected: Plant responds in character with personality.

- [ ] **Step 8: Flash ESP32 and test real connection**

1. Upload firmware to ESP32 via Arduino IDE
2. Open Serial Monitor (115200 baud)
3. Verify WiFi connects and WebSocket connects
4. Verify sensor readings appear on dashboard in real-time
5. Touch the plant's copper wire, verify touch reaction on dashboard

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: plant health tracker v1 — complete system"
```
