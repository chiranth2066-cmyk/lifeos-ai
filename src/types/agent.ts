import type { ModuleType, StepStatus, TaskStatus } from "./database";

export type AgentName =
  | "Intent Agent"
  | "Planning Agent"
  | "Research Agent"
  | "Comparison Agent"
  | "Execution Agent"
  | "Verification Agent"
  | "Memory Agent"
  | "Orchestrator";

export interface IntentAnalysis {
  objective: string;
  module: ModuleType;
  summaryTitle: string;
  constraints: {
    budget?: number;
    currency?: string;
    origin?: string;
    destination?: string;
    days?: number;
    travelers?: number;
    dates?: string;
    category?: string;
    priorities?: string[];
  };
  missingInfo: string[];
  requiresApproval: boolean;
  sensitiveActionType?: string;
  confidence: number;
}

export interface PlannedStep {
  order: number;
  name: string;
  description: string;
  agent: AgentName;
  dependsOn: number[];
  toolName?: string;
  requiresApproval?: boolean;
}

export interface ExecutionPlan {
  goal: string;
  module: ModuleType;
  estimatedSteps: number;
  steps: PlannedStep[];
}

export interface ToolResult<T = unknown> {
  toolName: string;
  provider: string;
  isMock: boolean;
  status: "success" | "partial" | "error";
  data: T;
  fetchedAt: string;
  warnings?: string[];
}

export interface ComparisonOption {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  rating: number;
  score: number;
  pros: string[];
  cons: string[];
  provider: string;
  isMock: boolean;
  bookingUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ComparisonResult {
  category: string;
  criteria: string[];
  rankedOptions: ComparisonOption[];
  recommendedOptionId: string | null;
  rationale: string;
}

export interface AgentStreamEvent {
  type:
    | "task_created"
    | "status_change"
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "activity"
    | "partial_result"
    | "approval_required"
    | "assistant_message"
    | "completed"
    | "error"
    | "cancelled";
  taskId: string;
  stepOrder?: number;
  stepStatus?: StepStatus;
  taskStatus?: TaskStatus;
  agent?: AgentName;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

