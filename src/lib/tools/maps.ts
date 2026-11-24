import { sanitizeExternalContent } from "@/lib/security";
import type { ToolResult } from "@/types/agent";

export interface MapLocationResult {
  query: string;
  displayName: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
}

export async function lookupLocationOnMap(query: string): Promise<ToolResult<MapLocationResult>> {
  const cleanQuery = sanitizeExternalContent(query, 120) || "Goa, India";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "LifeOS-AI-Assistant/1.0" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) throw new Error("Nominatim failed");
    const items = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;
    const first = items[0];
    if (!first) throw new Error("No coordinates found");

    return {
      toolName: "maps_geocode",
      provider: "OpenStreetMap Nominatim",
      isMock: false,
      status: "success",
      fetchedAt: new Date().toISOString(),
      data: {
        query: cleanQuery,
        displayName: sanitizeExternalContent(first.display_name, 160),
        latitude: Number(first.lat),
        longitude: Number(first.lon),
        mapsUrl,
      },
    };
  } catch {
    return {
      toolName: "maps_geocode",
      provider: "Maps Link Fallback (Mock coords)",
      isMock: true,
      status: "partial",
      fetchedAt: new Date().toISOString(),
      warnings: ["Live map geocoding unreachable; returning verified Google Maps search link with fallback coordinates."],
      data: {
        query: cleanQuery,
        displayName: cleanQuery,
        latitude: 15.2993,
        longitude: 74.124,
        mapsUrl,
      },
    };
  }
}

