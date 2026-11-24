import { NextResponse } from "next/server";
import { z } from "zod";
import { runExecutionAgent, runVerificationAgent } from "@/lib/agents/execution-agent";
import { runMemoryPersistAgent } from "@/lib/agents/memory-agent";
import { claimIdempotencyKey, releaseIdempotencyKey } from "@/lib/security";
import {
  getActiveSession,
  getApprovalById,
  getTaskWithDetails,
  logActivity,
  updateApproval,
  updateTask,
  updateTaskStepStatus,
} from "@/lib/supabase/store";

const DecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "modify"]),
  modificationNote: z.string().max(1000).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const approval = await getApprovalById(session, id);
  if (!approval) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  }

  let body: ReturnType<typeof DecisionSchema.parse>;
  try {
    body = DecisionSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid decision payload" },
      { status: 400 }
    );
  }

  // Check expiration
  if (new Date(approval.expires_at).getTime() < Date.now()) {
    await updateApproval(session, id, { status: "expired" });
    await logActivity(session, approval.task_id, "approval_expired", { approvalId: id });
    return NextResponse.json(
      { error: "This approval request has expired. Please re-run the task to get fresh verified details." },
      { status: 409 }
    );
  }

  if (approval.status !== "pending") {
    return NextResponse.json(
      { error: `Approval already processed with status "${approval.status}". Duplicate execution blocked.` },
      { status: 409 }
    );
  }

  if (body.decision === "reject") {
    const updated = await updateApproval(session, id, { status: "rejected" });
    await updateTaskStepStatus(session, approval.task_id, 4, "cancelled", { reason: "Rejected by user" });
    await updateTask(session, approval.task_id, {
      status: "cancelled",
      completed_at: new Date().toISOString(),
    });
    await logActivity(session, approval.task_id, "approval_rejected", { approvalId: id });
    return NextResponse.json({ approval: updated });
  }

  if (body.decision === "modify") {
    const updated = await updateApproval(session, id, { status: "modified" });
    await updateTaskStepStatus(session, approval.task_id, 4, "cancelled", {
      reason: "User requested plan modification",
      note: body.modificationNote,
    });
    await updateTask(session, approval.task_id, { status: "paused" });
    await logActivity(session, approval.task_id, "approval_modified", {
      approvalId: id,
      note: body.modificationNote,
    });
    return NextResponse.json({ approval: updated });
  }

  // Decision === "approve": guard against duplicate execution with idempotency key
  const claimed = claimIdempotencyKey(approval.idempotency_key);
  if (!claimed) {
    return NextResponse.json(
      { error: "Execution already in progress or completed for this approval." },
      { status: 409 }
    );
  }

  try {
    await updateApproval(session, id, {
      status: "approved",
      approved_at: new Date().toISOString(),
    });
    await updateTaskStepStatus(session, approval.task_id, 4, "completed", {
      approvedAt: new Date().toISOString(),
    });
    await updateTaskStepStatus(session, approval.task_id, 5, "running", {});
    await updateTask(session, approval.task_id, { status: "running" });

    // Execute approved action
    const outcome = await runExecutionAgent(approval, session.user.id);

    // Verify outcome via Verification Agent
    const verification = await runVerificationAgent(outcome);

    if (!verification.verified) {
      await updateTaskStepStatus(session, approval.task_id, 5, "failed", { verification });
      await updateTask(session, approval.task_id, { status: "failed" });
      await logActivity(session, approval.task_id, "execution_verification_failed", {
        approvalId: id,
        verification,
      });
      return NextResponse.json({ error: "Action execution could not be verified.", verification }, { status: 500 });
    }

    const updatedApproval = await updateApproval(session, id, {
      status: "executed",
      action_details: {
        ...approval.action_details,
        verificationResult: verification,
      },
    });

    await updateTaskStepStatus(session, approval.task_id, 5, "completed", { verification });

    const taskDetail = await getTaskWithDetails(session, approval.task_id);
    await updateTask(session, approval.task_id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      result_summary: {
        ...(taskDetail?.task.result_summary || {}),
        verification,
      },
    });

    await runMemoryPersistAgent(
      session,
      "history",
      `Approved ${approval.action_type}`,
      `${approval.action_details.title} (Ref: ${verification.referenceId})`
    );

    await logActivity(session, approval.task_id, "execution_verified", {
      approvalId: id,
      referenceId: verification.referenceId,
      isSimulated: verification.isSimulated,
    });

    return NextResponse.json({
      approval: updatedApproval,
      verification,
    });
  } catch (err) {
    releaseIdempotencyKey(approval.idempotency_key);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to execute approved action" },
      { status: 500 }
    );
  }
}

