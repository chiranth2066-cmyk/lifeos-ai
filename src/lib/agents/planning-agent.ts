import { z } from "zod";
import { getPrimaryLLMProvider } from "@/lib/ai/provider";
import type { ExecutionPlan, IntentAnalysis, PlannedStep } from "@/types/agent";

const PlanSchema = z.object({
  goal: z.string(),
  module: z.enum(["general", "travel", "shopping", "scheduler", "email", "finance"]),
  estimatedSteps: z.number(),
  steps: z.array(
    z.object({
      order: z.number(),
      name: z.string(),
      description: z.string(),
      agent: z.enum([
        "Intent Agent",
        "Planning Agent",
        "Research Agent",
        "Comparison Agent",
        "Execution Agent",
        "Verification Agent",
        "Memory Agent",
        "Orchestrator",
      ]),
      dependsOn: z.array(z.number()),
      toolName: z.string().optional(),
      requiresApproval: z.boolean().optional(),
    })
  ),
});

function buildDeterministicPlan(intent: IntentAnalysis): ExecutionPlan {
  const baseSteps: PlannedStep[] = [
    {
      order: 1,
      name: "Analyze objective & retrieve user memory",
      description: `Identify constraints (${intent.constraints.currency || "INR"} ${intent.constraints.budget?.toLocaleString() || "flexible"}) and load preferences.`,
      agent: "Memory Agent",
      dependsOn: [],
    },
  ];

  if (intent.module === "travel") {
    baseSteps.push(
      {
        order: 2,
        name: "Research transport, stays, weather & attractions",
        description: `Search options for ${intent.constraints.destination || "destination"} from ${intent.constraints.origin || "origin"}.`,
        agent: "Research Agent",
        dependsOn: [1],
        toolName: "travel_research",
      },
      {
        order: 3,
        name: "Compare options & optimize itinerary budget",
        description: "Rank transport & hotel combinations, verify budget fit, and assemble day-wise plan.",
        agent: "Comparison Agent",
        dependsOn: [2],
        toolName: "compare_options",
      },
      {
        order: 4,
        name: "Request human approval before booking",
        description: "Present full cost breakdown and provider details for explicit confirmation.",
        agent: "Orchestrator",
        dependsOn: [3],
        requiresApproval: true,
      },
      {
        order: 5,
        name: "Execute & verify approved booking",
        description: "Trigger selected booking provider and verify returned confirmation reference.",
        agent: "Verification Agent",
        dependsOn: [4],
      }
    );
  } else if (intent.module === "shopping") {
    baseSteps.push(
      {
        order: 2,
        name: "Search matching products & specifications",
        description: `Discover top products matching "${intent.objective}".`,
        agent: "Research Agent",
        dependsOn: [1],
        toolName: "shopping_search",
      },
      {
        order: 3,
        name: "Compare prices, specs & review scores",
        description: "Build structured comparison table and calculate value-for-money ranking.",
        agent: "Comparison Agent",
        dependsOn: [2],
        toolName: "compare_options",
      },
      {
        order: 4,
        name: "Request purchase approval",
        description: "Hold merchant checkout until user explicitly approves product & price.",
        agent: "Orchestrator",
        dependsOn: [3],
        requiresApproval: true,
      },
      {
        order: 5,
        name: "Verify merchant handoff",
        description: "Confirm approved selection and log verified reference.",
        agent: "Verification Agent",
        dependsOn: [4],
      }
    );
  } else if (intent.module === "scheduler") {
    baseSteps.push(
      {
        order: 2,
        name: "Inspect calendar & detect conflicts",
        description: "Read upcoming events, detect overlaps, and compute free focus blocks.",
        agent: "Research Agent",
        dependsOn: [1],
        toolName: "calendar_read",
      },
      {
        order: 3,
        name: "Prioritize tasks & build optimal schedule",
        description: "Assign high-priority focus blocks and buffer slots.",
        agent: "Comparison Agent",
        dependsOn: [2],
      },
      {
        order: 4,
        name: "Request approval to write calendar events",
        description: "Confirm proposed schedule blocks before adding to calendar.",
        agent: "Orchestrator",
        dependsOn: [3],
        requiresApproval: true,
      },
      {
        order: 5,
        name: "Commit & verify calendar updates",
        description: "Persist approved events and confirm no new conflicts exist.",
        agent: "Verification Agent",
        dependsOn: [4],
      }
    );
  } else if (intent.module === "email") {
    baseSteps.push(
      {
        order: 2,
        name: "Scan inbox & categorize conversations",
        description: "Identify unanswered important threads and extract action items.",
        agent: "Research Agent",
        dependsOn: [1],
        toolName: "email_scan",
      },
      {
        order: 3,
        name: "Draft context-aware replies",
        description: "Prepare clear, concise response drafts and follow-up suggestions.",
        agent: "Comparison Agent",
        dependsOn: [2],
      },
      {
        order: 4,
        name: "Request explicit send approval",
        description: "Never send emails autonomously; wait for user confirmation of recipient & body.",
        agent: "Orchestrator",
        dependsOn: [3],
        requiresApproval: true,
      },
      {
        order: 5,
        name: "Send approved replies & verify delivery",
        description: "Dispatch confirmed replies and verify thread status.",
        agent: "Verification Agent",
        dependsOn: [4],
      }
    );
  } else if (intent.module === "finance") {
    baseSteps.push(
      {
        order: 2,
        name: "Collect & categorize expense records",
        description: "Normalize transactions across Food, Transport, Subscriptions, Utilities, Shopping.",
        agent: "Research Agent",
        dependsOn: [1],
        toolName: "finance_analyze",
      },
      {
        order: 3,
        name: "Detect anomalies & savings opportunities",
        description: "Identify spending spikes, duplicate subscriptions, and budget optimizations.",
        agent: "Comparison Agent",
        dependsOn: [2],
      },
      {
        order: 4,
        name: "Save verified financial summary",
        description: "Present monthly breakdown and store non-sensitive preference insights.",
        agent: "Memory Agent",
        dependsOn: [3],
      }
    );
  } else {
    baseSteps.push(
      {
        order: 2,
        name: "Research relevant sources",
        description: "Run web search & knowledge tools for the request.",
        agent: "Research Agent",
        dependsOn: [1],
        toolName: "web_search",
      },
      {
        order: 3,
        name: "Synthesize & rank recommendations",
        description: "Evaluate findings and prepare actionable recommendations.",
        agent: "Comparison Agent",
        dependsOn: [2],
      },
      {
        order: 4,
        name: "Verify output & save task memory",
        description: "Validate response integrity and persist key context.",
        agent: "Memory Agent",
        dependsOn: [3],
      }
    );
  }

  return {
    goal: intent.objective,
    module: intent.module,
    estimatedSteps: baseSteps.length,
    steps: baseSteps,
  };
}

export async function runPlanningAgent(intent: IntentAnalysis): Promise<ExecutionPlan> {
  const deterministic = buildDeterministicPlan(intent);
  const llm = getPrimaryLLMProvider();
  if (!llm.isAvailable()) return deterministic;

  // Use deterministic structure as authoritative workflow guardrails, optionally enriched by Gemini descriptions
  const res = await llm.generateJSON<ExecutionPlan>({
    systemPrompt: `You are the Planning Agent of LifeOS AI. Generate a crisp 4-5 step execution plan in JSON matching the exact schema. If the module is travel, shopping, scheduler, or email, step 4 MUST have "requiresApproval": true and step 5 MUST be verification.`,
    userPrompt: JSON.stringify({ intent, templateSteps: deterministic.steps }),
    schema: PlanSchema,
  });

  if (res?.data && res.data.steps.length >= 3) {
    return res.data;
  }
  return deterministic;
}

