import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTravelPlan } from "@/lib/tools/travel";
import { compareProducts } from "@/lib/tools/shopping";
import { organizeSchedule } from "@/lib/tools/calendar";
import { analyzeInbox } from "@/lib/tools/email";
import { addUserExpenses, analyzeFinances } from "@/lib/tools/finance";
import { createApproval, createTask, getActiveSession, logActivity } from "@/lib/supabase/store";

const ModuleRequestSchema = z.discriminatedUnion("module", [
  z.object({
    module: z.literal("travel"),
    origin: z.string().default("Bengaluru"),
    destination: z.string().default("Goa"),
    days: z.number().min(1).max(14).default(3),
    travelers: z.number().min(1).max(12).default(2),
    budgetLimit: z.number().min(500).default(15000),
    currency: z.string().default("INR"),
  }),
  z.object({
    module: z.literal("shopping"),
    query: z.string().min(2).max(200),
    budgetLimit: z.number().min(100).optional(),
    currency: z.string().default("INR"),
  }),
  z.object({
    module: z.literal("scheduler"),
    date: z.string().optional(),
    goals: z.array(z.string()).optional(),
  }),
  z.object({
    module: z.literal("email"),
    filterQuery: z.string().optional(),
  }),
  z.object({
    module: z.literal("finance"),
    currency: z.string().default("INR"),
    newExpenses: z
      .array(
        z.object({
          date: z.string(),
          merchant: z.string().min(1).max(120),
          category: z.enum([
            "Food & Dining",
            "Transport",
            "Subscriptions",
            "Shopping",
            "Utilities",
            "Entertainment",
            "Travel",
          ]),
          amount: z.number().positive(),
          currency: z.string().default("INR"),
          notes: z.string().optional(),
        })
      )
      .optional(),
  }),
  z.object({
    module: z.literal("create_approval"),
    actionType: z.string(),
    title: z.string(),
    summary: z.string(),
    provider: z.string(),
    isMockProvider: z.boolean().default(true),
    totalCost: z.number().optional(),
    currency: z.string().default("INR"),
    recipientOrBooking: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
  }),
]);

export async function POST(request: Request) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = ModuleRequestSchema.parse(await request.json());

    if (body.module === "travel") {
      const data = await generateTravelPlan(body);
      return NextResponse.json({ data });
    }
    if (body.module === "shopping") {
      const data = await compareProducts(body);
      return NextResponse.json({ data });
    }
    if (body.module === "scheduler") {
      const data = organizeSchedule(session.user.id, body.date, body.goals);
      return NextResponse.json({ data });
    }
    if (body.module === "email") {
      const data = analyzeInbox(session.user.id, body.filterQuery);
      return NextResponse.json({ data });
    }
    if (body.module === "finance") {
      if (body.newExpenses && body.newExpenses.length > 0) {
        addUserExpenses(session.user.id, body.newExpenses);
      }
      const data = analyzeFinances(session.user.id, body.currency);
      return NextResponse.json({ data });
    }

    // create_approval from any module view so every sensitive button creates a real gated ApprovalRecord
    const task = await createTask(session, {
      conversationId: null,
      taskName: body.title,
      taskDescription: body.summary,
      moduleType: body.actionType.includes("travel")
        ? "travel"
        : body.actionType.includes("product")
          ? "shopping"
          : body.actionType.includes("calendar")
            ? "scheduler"
            : body.actionType.includes("email")
              ? "email"
              : "general",
    });

    const approval = await createApproval(session, {
      taskId: task.id,
      actionType: body.actionType,
      actionDetails: {
        title: body.title,
        summary: body.summary,
        provider: body.provider,
        isMockProvider: body.isMockProvider,
        totalCost: body.totalCost,
        currency: body.currency,
        recipientOrBooking: body.recipientOrBooking,
        termsAndConditions: [
          "Explicit user confirmation required prior to execution.",
          body.isMockProvider
            ? "Action uses clearly labeled mock sandbox provider."
            : "Connected provider will execute this action.",
        ],
        consequences: ["Logs verified execution record to LifeOS AI audit history."],
        payload: body.payload,
      },
    });

    await logActivity(session, task.id, "module_approval_created", {
      approvalId: approval.id,
      actionType: body.actionType,
    });

    return NextResponse.json({ approval, task });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Module request failed" },
      { status: 400 }
    );
  }
}

