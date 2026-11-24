import { sanitizeExternalContent } from "@/lib/security";
import type { ToolResult } from "@/types/agent";
import type { TravelWeatherSummary } from "@/types/modules";

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  51: "Light drizzle",
  61: "Light rain",
  63: "Moderate rain",
  65: "Heavy rain",
  80: "Rain showers",
  95: "Thunderstorms",
};

export async function fetchWeatherForecast(
  location: string,
  days = 3
): Promise<ToolResult<TravelWeatherSummary>> {
  const cleanLocation = sanitizeExternalContent(location, 100) || "Goa";

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLocation)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (!geoRes.ok) throw new Error("Geocoding failed");
    const geoJson = (await geoRes.json()) as {
      results?: Array<{ latitude: number; longitude: number; name: string; country?: string }>;
    };
    const place = geoJson.results?.[0];
    if (!place) throw new Error("Place not found");

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=${Math.min(Math.max(days, 1), 7)}`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (!weatherRes.ok) throw new Error("Weather API failed");
    const weatherJson = (await weatherRes.json()) as {
      current?: { temperature_2m: number; relative_humidity_2m: number; weather_code: number };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
      };
    };

    const daily = weatherJson.daily;
    const forecast = (daily?.time || []).map((date, idx) => ({
      date,
      tempMaxC: Math.round(daily?.temperature_2m_max[idx] ?? 30),
      tempMinC: Math.round(daily?.temperature_2m_min[idx] ?? 23),
      summary: WEATHER_CODE_LABELS[daily?.weather_code[idx] ?? 1] || "Pleasant",
    }));

    return {
      toolName: "weather_forecast",
      provider: "Open-Meteo Live API",
      isMock: false,
      status: "success",
      fetchedAt: new Date().toISOString(),
      data: {
        location: `${place.name}${place.country ? `, ${place.country}` : ""}`,
        temperatureC: Math.round(weatherJson.current?.temperature_2m ?? 29),
        condition: WEATHER_CODE_LABELS[weatherJson.current?.weather_code ?? 1] || "Partly cloudy",
        humidity: weatherJson.current?.relative_humidity_2m,
        forecast,
        provider: "Open-Meteo Live API",
        isMock: false,
      },
    };
  } catch {
    const today = new Date();
    const forecast = Array.from({ length: Math.min(Math.max(days, 1), 5) }, (_, idx) => {
      const d = new Date(today.getTime() + idx * 86_400_000);
      return {
        date: d.toISOString().slice(0, 10),
        tempMaxC: 31 - (idx % 2),
        tempMinC: 24,
        summary: idx % 2 === 0 ? "Warm & breezy (Mock estimate)" : "Partly cloudy (Mock estimate)",
      };
    });

    return {
      toolName: "weather_forecast",
      provider: "Mock Weather Fallback",
      isMock: true,
      status: "partial",
      fetchedAt: new Date().toISOString(),
      warnings: ["Live weather lookup timed out or was unreachable; showing clearly labeled mock estimate."],
      data: {
        location: cleanLocation,
        temperatureC: 30,
        condition: "Warm & sunny (Mock estimate)",
        humidity: 68,
        forecast,
        provider: "Mock Weather Fallback",
        isMock: true,
      },
    };
  }
}

