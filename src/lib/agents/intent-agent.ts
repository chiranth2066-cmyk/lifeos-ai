import { z } from "zod";
import { getPrimaryLLMProvider } from "@/lib/ai/provider";
import type { IntentAnalysis } from "@/types/agent";
import type { ModuleType } from "@/types/database";

const IntentSchema = z.object({
  objective: z.string(),
  module: z.enum(["general", "travel", "shopping", "scheduler", "email", "finance"]),
  summaryTitle: z.string(),
  constraints: z.object({
    budget: z.number().optional(),
    currency: z.string().optional(),
    origin: z.string().optional(),
    destination: z.string().optional(),
    days: z.number().optional(),
    travelers: z.number().optional(),
    dates: z.string().optional(),
    category: z.string().optional(),
    priorities: z.array(z.string()).optional(),
  }),
  missingInfo: z.array(z.string()),
  requiresApproval: z.boolean(),
  sensitiveActionType: z.string().optional(),
  confidence: z.number(),
});

function heuristicIntentParse(prompt: string, defaultOrigin: string, defaultCurrency: string): IntentAnalysis {
  const lower = prompt.toLowerCase();

  let detectedModule: ModuleType = "general";
  if (/(trip|travel|goa|flight|hotel|itinerary|vacation|weekend|mumbai|bus|train)/i.test(lower)) {
    detectedModule = "travel";
  } else if (/(laptop|buy|shop|compare|phone|product|deal|headphones|under\s*[₹$]?\s*\d+)/i.test(lower)) {
    detectedModule = "shopping";
  } else if (/(schedule|calendar|tomorrow|meeting|organize my day|slot|agenda)/i.test(lower)) {
    detectedModule = "scheduler";
  } else if (/(email|inbox|reply|replies|unanswered|gmail|mail)/i.test(lower)) {
    detectedModule = "email";
  } else if (/(expense|budget|finance|spend|spending|monthly|transaction|saving)/i.test(lower)) {
    detectedModule = "finance";
  }

  // Extract budget number e.g. ₹15,000 or 80000 or 15k
  let budget: number | undefined;
  const budgetMatch = prompt.match(/(?:under|budget|within|below|max|₹|rs\.?|inr|\$)\s*([\d,]+(?:\.\d+)?)\s*(k)?/i);
  if (budgetMatch) {
    const rawNum = Number(budgetMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      budget = budgetMatch[2] ? rawNum * 1000 : rawNum;
    }
  }

  // Extract days e.g. 3-day or 3 nights
  let days: number | undefined;
  const daysMatch = prompt.match(/(\d+)\s*[-\s]?(?:day|days|night|nights)/i);
  if (daysMatch) {
    days = Number(daysMatch[1]);
  } else if (lower.includes("weekend")) {
    days = 2;
  }

  // Extract travelers
  let travelers: number | undefined;
  if (/two\s+people|2\s+people|couple|for\s+2/i.test(lower)) travelers = 2;
  else if (/(\d+)\s+people/i.test(lower)) {
    const m = lower.match(/(\d+)\s+people/i);
    if (m) travelers = Number(m[1]);
  }

  // Extract destination for travel
  let destination: string | undefined;
  const toMatch = prompt.match(/(?:to|in)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (toMatch) {
    destination = toMatch[1];
  } else if (lower.includes("goa")) destination = "Goa";
  else if (lower.includes("mumbai")) destination = "Mumbai";
  else if (lower.includes("jaipur")) destination = "Jaipur";
  else if (lower.includes("manali")) destination = "Manali";

  // Extract origin if "from X"
  let origin = defaultOrigin.split(",")[0].trim() || "Bengaluru";
  const fromMatch = prompt.match(/from\s+([A-Z][a-zA-Z]+)/);
  if (fromMatch) origin = fromMatch[1];

  const missingInfo: string[] = [];
  if (detectedModule === "travel") {
    if (!destination) missingInfo.push("Destination city/region");
    if (!days) missingInfo.push("Exact travel dates / duration");
    if (!budget) missingInfo.push("Target budget");
  }

  const requiresApproval = detectedModule === "travel" || detectedModule === "shopping" || detectedModule === "scheduler" || detectedModule === "email";
  const sensitiveActionType =
    detectedModule === "travel"
      ? "travel_booking_reservation"
      : detectedModule === "shopping"
        ? "product_purchase_redirect"
        : detectedModule === "scheduler"
          ? "calendar_event_creation"
          : detectedModule === "email"
            ? "send_email_replies"
            : undefined;

  return {
    objective: prompt.trim(),
    module: detectedModule,
    summaryTitle: prompt.trim().slice(0, 64),
    constraints: {
      budget,
      currency: defaultCurrency || "INR",
      origin,
      destination,
      days: days || (detectedModule === "travel" ? 3 : undefined),
      travelers: travelers || (detectedModule === "travel" ? 2 : undefined),
      priorities: detectedModule === "shopping" ? ["value", "performance", "reviews"] : undefined,
    },
    missingInfo,
    requiresApproval,
    sensitiveActionType,
    confidence: 0.84,
  };
}

export async function runIntentAgent(
  prompt: string,
  context: { defaultOrigin: string; defaultCurrency: string; memoriesSummary: string }
): Promise<IntentAnalysis> {
  const fallback = heuristicIntentParse(prompt, context.defaultOrigin, context.defaultCurrency);
  const llm = getPrimaryLLMProvider();

  if (!llm.isAvailable()) {
    return fallback;
  }

  const res = await llm.generateJSON<IntentAnalysis>({
    systemPrompt: `You are the Intent Agent of LifeOS AI.
Analyze the user's request and return strict JSON matching:
{
  "objective": string,
  "module": "general" | "travel" | "shopping" | "scheduler" | "email" | "finance",
  "summaryTitle": string (max 60 chars),
  "constraints": {
    "budget"?: number,
    "currency"?: string,
    "origin"?: string,
    "destination"?: string,
    "days"?: number,
    "travelers"?: number,
    "dates"?: string,
    "category"?: string,
    "priorities"?: string[]
  },
  "missingInfo": string[],
  "requiresApproval": boolean (true if booking, purchasing, sending emails, or modifying calendar),
  "sensitiveActionType"?: string,
  "confidence": number (0 to 1)
}
User context/memories: ${context.memoriesSummary}. Default origin: ${context.defaultOrigin}, currency: ${context.defaultCurrency}.`,
    userPrompt: prompt,
    schema: IntentSchema,
  });

  return res?.data ?? fallback;
}

