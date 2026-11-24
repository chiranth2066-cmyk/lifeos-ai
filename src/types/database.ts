export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "waiting_for_approval"
  | "failed"
  | "cancelled"
  | "paused";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "waiting_for_approval"
  | "failed"
  | "cancelled";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "modified"
  | "expired"
  | "executed";

export type ModuleType =
  | "general"
  | "travel"
  | "shopping"
  | "scheduler"
  | "email"
  | "finance";

export type IntegrationStatus = "connected" | "mock" | "disconnected" | "error";

export type MemoryType = "preference" | "constraint" | "context" | "history";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferences: Record<string, unknown>;
  location: string;
  currency: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TaskRecord {
  id: string;
  user_id: string;
  conversation_id: string | null;
  task_name: string;
  task_description: string;
  module_type: ModuleType;
  status: TaskStatus;
  execution_plan: Record<string, unknown>;
  result_summary: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface TaskStepRecord {
  id: string;
  task_id: string;
  step_name: string;
  step_description: string;
  agent_name: string;
  status: StepStatus;
  result: Record<string, unknown>;
  execution_order: number;
}

export interface ApprovalRecord {
  id: string;
  task_id: string;
  user_id: string;
  action_type: string;
  action_details: ApprovalActionDetails;
  idempotency_key: string;
  status: ApprovalStatus;
  approved_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface ApprovalActionDetails {
  title: string;
  summary: string;
  provider: string;
  isMockProvider: boolean;
  totalCost?: number;
  currency?: string;
  costBreakdown?: Array<{ label: string; amount: number }>;
  recipientOrBooking?: string;
  termsAndConditions: string[];
  consequences: string[];
  payload: Record<string, unknown>;
  verificationResult?: VerificationOutcome;
}

export interface VerificationOutcome {
  verified: boolean;
  referenceId: string | null;
  providerResponse: string;
  isSimulated: boolean;
  checkedAt: string;
}

export interface IntegrationRecord {
  id: string;
  user_id: string;
  provider: string;
  connection_status: IntegrationStatus;
  config?: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLogRecord {
  id: string;
  user_id: string;
  task_id: string | null;
  event_type: string;
  event_details: Record<string, unknown>;
  created_at: string;
}

export interface MemoryRecord {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  memory_content: Record<string, unknown>;
  created_at: string;
}

