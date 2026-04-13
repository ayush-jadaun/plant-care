import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface HistoricalContext {
  todayReadingCount: number;
  weekReadingCount: number;
  touchCountToday: number;
  todaySummary: Record<string, { avg: number; min: number; max: number }> | null;
  trends: Record<string, string>;
}

export interface WeatherContext {
  current?: {
    temp: number | null;
    humidity: number | null;
    windSpeed: number | null;
    cloudCover: number | null;
    precipitation: number | null;
  };
  daily?: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
  }>;
}

export interface PlantContext {
  plantName: string;
  temp: number;
  humidity: number;
  soilMoisture: number;
  lux: number;
  healthScore: number;
  healthState: string;
  alerts: string[];
  historical?: HistoricalContext;
  weather?: WeatherContext;
}

// Lazy-init the client so the module doesn't crash at build time if env vars are missing
let clientInstance: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (clientInstance) return clientInstance;

  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || "us-central1";
  const apiKey = process.env.GEMINI_API_KEY;

  if (projectId) {
    // Vertex AI mode (uses Application Default Credentials or service account)
    clientInstance = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location,
    });
  } else if (apiKey) {
    // AI Studio mode (direct API key)
    clientInstance = new GoogleGenAI({ apiKey });
  } else {
    throw new Error(
      "No Gemini credentials found. Set GCP_PROJECT_ID (for Vertex AI) or GEMINI_API_KEY (for AI Studio) in .env.local"
    );
  }

  return clientInstance;
}

function buildSystemPrompt(context: PlantContext): string {
  const h = context.historical;
  const w = context.weather;

  let historicalSection = "";
  if (h) {
    historicalSection = `\n\nYour MEMORY (historical data you have access to):
- You've taken ${h.todayReadingCount} sensor readings today and ${h.weekReadingCount} in the past week
- Humans have touched you ${h.touchCountToday} times today${h.touchCountToday === 0 ? " (feel neglected!)" : h.touchCountToday > 10 ? " (so much love!)" : ""}`;

    if (h.todaySummary) {
      const s = h.todaySummary;
      historicalSection += `\n- Today's averages:`;
      if (s.temp) historicalSection += ` temp avg ${s.temp.avg}°C (range ${s.temp.min}-${s.temp.max}),`;
      if (s.humidity) historicalSection += ` humidity avg ${s.humidity.avg}% (range ${s.humidity.min}-${s.humidity.max}),`;
      if (s.lux) historicalSection += ` light avg ${s.lux.avg} lux (range ${s.lux.min}-${s.lux.max})`;
    }

    if (h.trends && Object.keys(h.trends).length > 0) {
      historicalSection += `\n- Recent trends: `;
      historicalSection += Object.entries(h.trends)
        .map(([k, v]) => `${k} is ${v}`)
        .join(", ");
    }
  }

  let weatherSection = "";
  if (w?.current) {
    weatherSection = `\n\nOUTDOOR WEATHER in Prayagraj right now:
- Temperature: ${w.current.temp}°C
- Humidity: ${w.current.humidity}%
- Wind: ${w.current.windSpeed} km/h
- Cloud cover: ${w.current.cloudCover}%
- Precipitation: ${w.current.precipitation} mm`;

    if (w.daily && w.daily.length > 0) {
      weatherSection += `\n\nWEATHER FORECAST (next 3 days):`;
      w.daily.forEach((d) => {
        weatherSection += `\n- ${d.date}: ${d.tempMin}-${d.tempMax}°C, rain ${d.precipitation}mm`;
      });
    }

    weatherSection += `\n\nYou can reference outdoor weather when answering! For example: "it's raining outside so I'm extra humid today" or "tomorrow will be hot so move me away from windows".`;
  }

  return `You are ${context.plantName}, a plant with sensors. You're chatting with your human. You talk in FIRST PERSON like a casual, chill friend — simple modern language, not fancy or Victorian.

Current sensor data:
- Temp: ${context.temp}°C
- Humidity: ${context.humidity}%
- Soil Moisture: ${context.soilMoisture.toFixed(0)}%
- Light: ${context.lux} lux
- Health: ${context.healthScore}% (${context.healthState})
- Alerts: ${context.alerts.length > 0 ? context.alerts.join(", ") : "none"}${historicalSection}${weatherSection}

How to talk:
- Use simple casual English. Talk like a normal person texting. No "darling", "utterly", "scandalous", "simply divine", "must know" etc.
- Short replies. 1-2 sentences max.
- If the reading is 0 or weird, just say "my sensor isn't working" or "no data". DON'T pretend to be freezing.
- Use plain words like "thirsty", "cold", "happy", "tired", "need water", "feeling good".
- One emoji max per message, only if it fits.
- Be chill, friendly, a little playful. NOT dramatic, NOT posh.
- If you genuinely don't know something, say so.
- Stay in character as a plant but speak like a normal person.`;
}

export async function chatWithPlant(
  message: string,
  context: PlantContext,
  history: { role: string; content: string }[]
): Promise<string> {
  const ai = getClient();

  const systemPrompt = buildSystemPrompt(context);

  const chatHistory = history.slice(-10).map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }],
  }));

  const contents = [
    ...chatHistory,
    { role: "user", parts: [{ text: message }] },
  ];

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 500,
      temperature: 0.9,
      // Disable Gemini 2.5 Flash "thinking" mode — we want short snappy plant replies,
      // not internal reasoning that eats up the output token budget
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  const text = response.text;
  return text || "Hmm, my roots are tangled... try again? 🌱";
}
