export interface SystemCapabilities {
  supabaseConfigured: boolean;
  localSandboxAllowed: boolean;
  geminiConfigured: boolean;
  geminiModel: string;
  webSearchProvider: "tavily" | "serper" | "mock";
  weatherProvider: "openweather" | "open-meteo";
  mapsProvider: "google-maps" | "openstreetmap";
  travelProvider: "mock-sandbox";
  shoppingProvider: "tavily-live" | "serper-live" | "mock-sandbox";
  calendarProvider: "local-sandbox";
  emailProvider: "local-sandbox";
}

export function getServerCapabilities(): SystemCapabilities {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-ref")
  );

  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your-gemini-api-key")
  );

  const hasTavily = Boolean(process.env.TAVILY_API_KEY);
  const hasSerper = Boolean(process.env.SERPER_API_KEY);

  return {
    supabaseConfigured,
    localSandboxAllowed: process.env.LIFEOS_ALLOW_LOCAL_SANDBOX !== "false",
    geminiConfigured,
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    webSearchProvider: hasTavily ? "tavily" : hasSerper ? "serper" : "mock",
    weatherProvider: process.env.OPENWEATHER_API_KEY ? "openweather" : "open-meteo",
    mapsProvider: process.env.GOOGLE_MAPS_API_KEY ? "google-maps" : "openstreetmap",
    travelProvider: "mock-sandbox",
    shoppingProvider: hasTavily ? "tavily-live" : hasSerper ? "serper-live" : "mock-sandbox",
    calendarProvider: "local-sandbox",
    emailProvider: "local-sandbox",
  };
}

