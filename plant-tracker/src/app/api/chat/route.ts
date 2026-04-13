import { NextRequest, NextResponse } from "next/server";
import { chatWithPlant, PlantContext } from "@/lib/gemini";
import { getReadingsForRange, getDailySummary } from "@/lib/dataStore";
import fs from "fs";
import path from "path";

async function fetchWeather() {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=25.4358&longitude=81.8463&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3";
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const current = {
      temp: data.current?.temperature_2m ?? null,
      humidity: data.current?.relative_humidity_2m ?? null,
      windSpeed: data.current?.wind_speed_10m ?? null,
      cloudCover: data.current?.cloud_cover ?? null,
      precipitation: data.current?.precipitation ?? null,
    };
    const daily = (data.daily?.time || []).map((d: string, i: number) => ({
      date: d,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
    }));
    return { current, daily };
  } catch {
    return undefined;
  }
}

const DATA_DIR = path.join(process.cwd(), "data");

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getTodayFileName(): string {
  return `${getTodayString()}.json`;
}

interface ChatEntry {
  role: string;
  content: string;
  timestamp: number;
}

function getChatHistory(): ChatEntry[] {
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
  history.push({ role, content, timestamp: Date.now() });
  fs.writeFileSync(filePath, JSON.stringify(history));
}

function getTouchCount(): number {
  const touchDir = path.join(DATA_DIR, "touches");
  const filePath = path.join(touchDir, getTodayFileName());
  if (!fs.existsSync(filePath)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

function buildHistoricalContext() {
  const todayStr = getTodayString();

  // Today's summary
  const todaySummary = getDailySummary(todayStr);

  // Last 24h readings
  const last24h = getReadingsForRange("24h");

  // Last 7 days readings
  const last7d = getReadingsForRange("7d");

  // Touch count today
  const touchCount = getTouchCount();

  // Compute trends
  const trends: Record<string, string> = {};
  if (last24h.length > 10) {
    const first10 = last24h.slice(0, 10);
    const last10 = last24h.slice(-10);

    const avg = (arr: typeof first10, key: "temp" | "humidity" | "lux" | "soilAnalog") =>
      arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length;

    const tempChange = avg(last10, "temp") - avg(first10, "temp");
    const humChange = avg(last10, "humidity") - avg(first10, "humidity");
    const luxChange = avg(last10, "lux") - avg(first10, "lux");

    trends.temp = tempChange > 1 ? "warming" : tempChange < -1 ? "cooling" : "stable";
    trends.humidity = humChange > 3 ? "rising" : humChange < -3 ? "falling" : "stable";
    trends.light = luxChange > 50 ? "getting brighter" : luxChange < -50 ? "getting darker" : "stable";
  }

  return {
    todayReadingCount: last24h.length,
    weekReadingCount: last7d.length,
    touchCountToday: touchCount,
    todaySummary: todaySummary?.summary || null,
    trends,
  };
}

export async function GET() {
  // Return current chat history for today
  const history = getChatHistory();
  return NextResponse.json({ history });
}

export async function DELETE() {
  // Clear today's chat history
  const chatDir = path.join(DATA_DIR, "chats");
  const filePath = path.join(chatDir, getTodayFileName());
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const { message, context }: { message: string; context: PlantContext } = await req.json();

    if (!message || !context) {
      return NextResponse.json({ error: "message and context are required" }, { status: 400 });
    }

    // Enrich context with historical + weather data
    const historical = buildHistoricalContext();
    const weather = await fetchWeather();
    const enrichedContext: PlantContext = {
      ...context,
      historical,
      weather,
    };

    const history = getChatHistory();
    const response = await chatWithPlant(message, enrichedContext, history);
    saveChatMessage("user", message);
    saveChatMessage("model", response);
    return NextResponse.json({ response });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("=================================");
    console.error("GEMINI CHAT ERROR:");
    console.error("Message:", errorMessage);
    console.error("Stack:", errorStack);
    console.error("=================================");
    return NextResponse.json(
      {
        error: "Failed to chat with plant",
        errorDetail: errorMessage,
        response: `⚠️ Error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
