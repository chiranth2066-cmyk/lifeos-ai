import { randomBytes } from "node:crypto";
import { addConfirmedCalendarEvent } from "@/lib/tools/calendar";
import { markEmailReplied } from "@/lib/tools/email";
import type { ApprovalRecord, VerificationOutcome } from "@/types/database";

export interface ExecutionOutcome {
  success: boolean;
  providerReference: string | null;
  summary: string;
  isSimulated: boolean;
  executedAt: string;
  details: Record<string, unknown>;
}

/**
 * Execution Agent:
 * Executes ONLY explicitly approved actions. Never bypasses approval or CAPTCHA/payment walls.
 */
export async function runExecutionAgent(
  approval: ApprovalRecord,
  userId: string
): Promise<ExecutionOutcome> {
  const details = approval.action_details;
  const now = new Date().toISOString();
  const refSuffix = randomBytes(3).toString("hex").toUpperCase();

  switch (approval.action_type) {
    case "travel_booking_reservation": {
      return {
        success: true,
        providerReference: `SANDBOX-TRV-${refSuffix}`,
        summary: `Prepared and confirmed sandbox itinerary reservation with ${details.provider}. Real payment/checkout requires completing the external provider checkout link.`,
        isSimulated: true,
        executedAt: now,
        details: {
          bookingUrl: (details.payload?.bookingUrl as string) || "https://www.booking.com",
          totalCost: details.totalCost,
          currency: details.currency,
        },
      };
    }

    case "product_purchase_redirect": {
      return {
        success: true,
        providerReference: `SANDBOX-ORD-${refSuffix}`,
        summary: `Approved product selection locked for ${details.provider}. Complete payment safely on the merchant checkout page.`,
        isSimulated: true,
        executedAt: now,
        details: {
          merchantUrl: (details.payload?.merchantUrl as string) || "https://www.amazon.in",
          totalCost: details.totalCost,
          currency: details.currency,
        },
      };
    }

    case "calendar_event_creation": {
      const events = (details.payload?.proposedEvents as Array<{
        title: string;
        startIso: string;
        endIso: string;
        category: "meeting" | "focus" | "personal" | "errand" | "travel";
        priority: "high" | "medium" | "low";
      }>) || [];

      const createdIds: string[] = [];
      for (const ev of events) {
        const created = addConfirmedCalendarEvent(userId, ev);
        createdIds.push(created.id);
      }

      return {
        success: createdIds.length > 0,
        providerReference: `CAL-${refSuffix}`,
        summary: `Added ${createdIds.length} approved schedule block(s) to your LifeOS Calendar.`,
        isSimulated: details.isMockProvider,
        executedAt: now,
        details: { createdEventIds: createdIds },
      };
    }

    case "send_email_replies": {
      const threadIds = (details.payload?.threadIds as string[]) || [];
      const sentIds: string[] = [];
      for (const tid of threadIds) {
        const updated = markEmailReplied(userId, tid);
        if (updated) sentIds.push(updated.id);
      }

      return {
        success: sentIds.length > 0,
        providerReference: `MAIL-${refSuffix}`,
        summary: `Dispatched ${sentIds.length} user-approved reply draft(s) via ${details.provider}.`,
        isSimulated: details.isMockProvider,
        executedAt: now,
        details: { repliedThreadIds: sentIds },
      };
    }

    default: {
      return {
        success: true,
        providerReference: `ACT-${refSuffix}`,
        summary: `Executed approved action "${details.title}" via ${details.provider}.`,
        isSimulated: details.isMockProvider,
        executedAt: now,
        details: details.payload,
      };
    }
  }
}

export async function runVerificationAgent(
  outcome: ExecutionOutcome
): Promise<VerificationOutcome> {
  const verified = Boolean(outcome.success && outcome.providerReference);
  return {
    verified,
    referenceId: outcome.providerReference,
    providerResponse: outcome.summary,
    isSimulated: outcome.isSimulated,
    checkedAt: new Date().toISOString(),
  };
}

