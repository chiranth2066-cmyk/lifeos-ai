import { randomUUID } from "node:crypto";
import type { ExpenseEntry, FinanceAnalysisResult } from "@/types/modules";

const globalFinanceStore = globalThis as unknown as {
  __lifeosExpenses?: Map<string, ExpenseEntry[]>;
};

function getExpenseMap(): Map<string, ExpenseEntry[]> {
  if (!globalFinanceStore.__lifeosExpenses) {
    globalFinanceStore.__lifeosExpenses = new Map();
  }
  return globalFinanceStore.__lifeosExpenses;
}

export function getUserExpenses(userId: string): ExpenseEntry[] {
  const map = getExpenseMap();
  if (!map.has(userId)) {
    const today = new Date();
    const d = (offsetDays: number) =>
      new Date(today.getTime() - offsetDays * 86_400_000).toISOString().slice(0, 10);

    map.set(userId, [
      { id: randomUUID(), date: d(1), merchant: "Swiggy / Third Wave Coffee", category: "Food & Dining", amount: 640, currency: "INR", notes: "Coffee & lunch" },
      { id: randomUUID(), date: d(2), merchant: "Uber Intercity", category: "Transport", amount: 1180, currency: "INR", notes: "Airport transfer" },
      { id: randomUUID(), date: d(4), merchant: "Cloud & AI Pro Subscriptions", category: "Subscriptions", amount: 2499, currency: "INR", notes: "Monthly recurring" },
      { id: randomUUID(), date: d(6), merchant: "Streaming & Music Bundle", category: "Subscriptions", amount: 899, currency: "INR", notes: "Duplicate entertainment plan" },
      { id: randomUUID(), date: d(9), merchant: "BESCOM Electricity & Fiber", category: "Utilities", amount: 3150, currency: "INR", notes: "Monthly bills" },
      { id: randomUUID(), date: d(12), merchant: "FreshMart Groceries", category: "Food & Dining", amount: 4250, currency: "INR", notes: "Weekly groceries" },
      { id: randomUUID(), date: d(15), merchant: "Weekend Electronics Accessory", category: "Shopping", amount: 6990, currency: "INR", notes: "Mechanical keyboard" },
      { id: randomUUID(), date: d(18), merchant: "Toit Brewpub Dinner", category: "Entertainment", amount: 3200, currency: "INR", notes: "Team dinner" },
      { id: randomUUID(), date: d(21), merchant: "Namma Metro & Auto", category: "Transport", amount: 940, currency: "INR", notes: "Commute" },
    ]);
  }
  return map.get(userId)!;
}

export function addUserExpenses(userId: string, entries: Array<Omit<ExpenseEntry, "id">>): ExpenseEntry[] {
  const list = getUserExpenses(userId);
  const created = entries.map((e) => ({ ...e, id: randomUUID() }));
  list.unshift(...created);
  return list;
}

export function analyzeFinances(userId: string, currency = "INR", periodLabel = "Last 30 Days"): FinanceAnalysisResult {
  const expenses = getUserExpenses(userId);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCat = new Map<string, number>();
  for (const e of expenses) {
    byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
  }

  const categoryTotals = Array.from(byCat.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const avg = expenses.length > 0 ? totalSpent / expenses.length : 0;
  const unusualExpenses = expenses
    .filter((e) => e.amount > avg * 1.8)
    .map((e) => ({
      merchant: e.merchant,
      amount: e.amount,
      reason: `Significantly above average transaction size (${currency} ${Math.round(avg).toLocaleString()})`,
    }));

  const subscriptionTotal = byCat.get("Subscriptions") || 0;
  const foodTotal = byCat.get("Food & Dining") || 0;

  return {
    periodLabel,
    currency,
    totalSpent,
    categoryTotals,
    unusualExpenses,
    patterns: [
      `Top spending category is ${categoryTotals[0]?.category || "Food & Dining"} at ${categoryTotals[0]?.percentage || 0}% of total spend.`,
      `Recurring subscriptions account for ${currency} ${subscriptionTotal.toLocaleString()} this month.`,
      unusualExpenses.length > 0
        ? `Detected ${unusualExpenses.length} high-value spike(s), led by ${unusualExpenses[0].merchant}.`
        : "Spending velocity is steady across categories.",
    ],
    savingsSuggestions: [
      {
        title: "Consolidate overlapping subscriptions",
        estimatedMonthlySavings: Math.round(subscriptionTotal * 0.25) || 450,
        detail: "Review duplicate streaming/cloud plans to trim ~25% of recurring subscription spend.",
      },
      {
        title: "Set weekly dining-out cap",
        estimatedMonthlySavings: Math.round(foodTotal * 0.18) || 850,
        detail: "Batching weekday lunches vs delivery fees typically recovers 15–20% in Food & Dining.",
      },
    ],
    expenses,
    dataSource: "User Expense Ledger (Local Sandbox / Uploaded CSV)",
    isMock: true,
  };
}

