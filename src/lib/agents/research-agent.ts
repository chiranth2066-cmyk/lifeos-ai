import { generateTravelPlan } from "@/lib/tools/travel";
import { compareProducts } from "@/lib/tools/shopping";
import { organizeSchedule } from "@/lib/tools/calendar";
import { analyzeInbox } from "@/lib/tools/email";
import { analyzeFinances } from "@/lib/tools/finance";
import { runWebSearch } from "@/lib/tools/web-search";
import type { IntentAnalysis } from "@/types/agent";
import type {
  EmailAssistantResult,
  FinanceAnalysisResult,
  SchedulerResult,
  ShoppingResult,
  TravelPlanResult,
} from "@/types/modules";

export interface ResearchBundle {
  module: IntentAnalysis["module"];
  travel?: TravelPlanResult;
  shopping?: ShoppingResult;
  scheduler?: SchedulerResult;
  email?: EmailAssistantResult;
  finance?: FinanceAnalysisResult;
  webSearch?: Awaited<ReturnType<typeof runWebSearch>>;
  highlights: string[];
}

export async function runResearchAgent(
  intent: IntentAnalysis,
  userId: string
): Promise<ResearchBundle> {
  const currency = intent.constraints.currency || "INR";

  switch (intent.module) {
    case "travel": {
      const travel = await generateTravelPlan({
        origin: intent.constraints.origin || "Bengaluru",
        destination: intent.constraints.destination || "Goa",
        days: intent.constraints.days || 3,
        travelers: intent.constraints.travelers || 2,
        budgetLimit: intent.constraints.budget || 15000,
        currency,
      });
      return {
        module: "travel",
        travel,
        highlights: [
          `Found ${travel.transports.length} transport options & ${travel.hotels.length} accommodations in ${travel.destination}.`,
          `Weather (${travel.weather.provider}): ${travel.weather.temperatureC}°C, ${travel.weather.condition}.`,
          `Estimated total budget: ${currency} ${travel.budgetBreakdown.totalEstimated.toLocaleString()} (Target: ${currency} ${travel.budgetLimit.toLocaleString()}).`,
        ],
      };
    }

    case "shopping": {
      const shopping = await compareProducts({
        query: intent.objective,
        budgetLimit: intent.constraints.budget || 80000,
        currency,
      });
      return {
        module: "shopping",
        shopping,
        highlights: shopping.comparisonHighlights,
      };
    }

    case "scheduler": {
      const scheduler = organizeSchedule(userId, intent.constraints.dates);
      return {
        module: "scheduler",
        scheduler,
        highlights: scheduler.priorities,
      };
    }

    case "email": {
      const email = analyzeInbox(userId, intent.objective);
      return {
        module: "email",
        email,
        highlights: [
          `Scanned ${email.totalScanned} inbox conversations.`,
          `Identified ${email.unansweredImportantCount} unanswered priority email(s) with draft replies ready.`,
        ],
      };
    }

    case "finance": {
      const finance = analyzeFinances(userId, currency);
      return {
        module: "finance",
        finance,
        highlights: finance.patterns,
      };
    }

    default: {
      const webSearch = await runWebSearch(intent.objective, 5);
      return {
        module: "general",
        webSearch,
        highlights: webSearch.data.map((d) => `${d.title}: ${d.snippet}`),
      };
    }
  }
}

