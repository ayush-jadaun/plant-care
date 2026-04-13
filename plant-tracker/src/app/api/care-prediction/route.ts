import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let clientInstance: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (clientInstance) return clientInstance;
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || "us-central1";
  const apiKey = process.env.GEMINI_API_KEY;
  if (projectId) {
    clientInstance = new GoogleGenAI({ vertexai: true, project: projectId, location });
  } else if (apiKey) {
    clientInstance = new GoogleGenAI({ apiKey });
  } else {
    throw new Error("No Gemini credentials");
  }
  return clientInstance;
}

export async function POST(req: NextRequest) {
  try {
    const { sensorData, weather, plantName } = await req.json();

    const ai = getClient();

    const prompt = `You are a plant care expert advising about a houseplant named "${plantName || "My Plant"}".

CURRENT PLANT SENSORS:
- Temperature: ${sensorData?.temp ?? "unknown"}°C
- Humidity: ${sensorData?.humidity ?? "unknown"}%
- Soil moisture: ${sensorData?.soilMoisture ?? "unknown"}%
- Light: ${sensorData?.lux ?? "unknown"} lux
- Health: ${sensorData?.healthScore ?? "unknown"}%

OUTDOOR WEATHER RIGHT NOW:
- Temperature: ${weather?.current?.temp ?? "unknown"}°C
- Humidity: ${weather?.current?.humidity ?? "unknown"}%
- Cloud cover: ${weather?.current?.cloudCover ?? "unknown"}%
- Wind: ${weather?.current?.windSpeed ?? "unknown"} km/h

UPCOMING 3-DAY FORECAST:
${(weather?.daily || [])
  .map(
    (d: { date: string; tempMax: number; tempMin: number; precipitation: number; sunshineDuration: number }) =>
      `- ${d.date}: ${d.tempMin}-${d.tempMax}°C, rain ${d.precipitation}mm, sunshine ${Math.round(d.sunshineDuration / 3600)}h`
  )
  .join("\n")}

Give 3-5 SHORT actionable care tips based on this data. Format:
- Use simple casual English (no "darling" or posh language)
- Each tip on its own line starting with a relevant emoji
- Reference specific weather events ("since it's raining tomorrow...", "with the heat wave coming...")
- Be practical and specific (watering frequency, moving plant, etc.)
- Maximum 5 tips, keep each under 15 words
- Focus on what the HUMAN should do

Output ONLY the tips, no intro or outro.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 600,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    return NextResponse.json({ advice: response.text || "No advice available right now." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg, advice: `⚠️ ${msg}` }, { status: 500 });
  }
}
