import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat") || "25.4358"; // Default: Prayagraj
  const lon = req.nextUrl.searchParams.get("lon") || "81.8463";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover,precipitation&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto&forecast_days=3`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`Weather API returned ${res.status}`);

    const data = await res.json();

    // Simplify the structure
    const current = {
      temp: data.current?.temperature_2m ?? null,
      humidity: data.current?.relative_humidity_2m ?? null,
      windSpeed: data.current?.wind_speed_10m ?? null,
      cloudCover: data.current?.cloud_cover ?? null,
      precipitation: data.current?.precipitation ?? null,
      weatherCode: data.current?.weather_code ?? null,
    };

    // Next 24 hours
    const now = new Date();
    const hourly = (data.hourly?.time || [])
      .map((t: string, i: number) => ({
        time: t,
        temp: data.hourly.temperature_2m[i],
        humidity: data.hourly.relative_humidity_2m[i],
        weatherCode: data.hourly.weather_code[i],
        precipProbability: data.hourly.precipitation_probability[i],
      }))
      .filter((h: { time: string }) => new Date(h.time) >= now)
      .slice(0, 24);

    const daily = (data.daily?.time || []).map((d: string, i: number) => ({
      date: d,
      weatherCode: data.daily.weather_code[i],
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      sunshineDuration: data.daily.sunshine_duration[i],
    }));

    return NextResponse.json({ current, hourly, daily, timezone: data.timezone });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
