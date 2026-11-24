"use client";

import React, { useEffect, useState } from "react";
import { Wallet, TrendingDown, AlertCircle, Plus, Loader2 } from "lucide-react";
import type { ExpenseEntry, FinanceAnalysisResult } from "@/types/modules";

interface FinanceOrganizerViewProps {
  initialResult?: FinanceAnalysisResult | null;
}

export function FinanceOrganizerView({ initialResult }: FinanceOrganizerViewProps) {
  const [localData, setLocalData] = useState<FinanceAnalysisResult | null>(null);
  const data = localData ?? initialResult ?? null;
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseEntry["category"]>("Food & Dining");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) return;
    let active = true;
    (async () => {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "finance", currency: "INR" }),
      });
      const json = await res.json();
      if (active && res.ok && json.data) setLocalData(json.data);
    })();
    return () => {
      active = false;
    };
  }, [data]);

  async function loadAnalysis(newExpense?: Omit<ExpenseEntry, "id">) {
    setLoading(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "finance",
          currency: "INR",
          newExpenses: newExpense ? [newExpense] : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) setLocalData(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(amount);
    if (!merchant.trim() || Number.isNaN(numeric) || numeric <= 0) return;
    await loadAnalysis({
      date: new Date().toISOString().slice(0, 10),
      merchant: merchant.trim(),
      category,
      amount: numeric,
      currency: "INR",
    });
    setMerchant("");
    setAmount("");
  }

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-400" />
            AI Finance Organizer
          </h1>
          <p className="text-xs text-zinc-400">
            Categorizes expenses, spots anomalies & recurring subscriptions, and computes savings ideas (read-only advisor).
          </p>
        </div>
        {data && (
          <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-[10px] text-zinc-400">
            {data.dataSource}
          </span>
        )}
      </div>

      {/* Add Expense Entry */}
      <form
        onSubmit={handleAddExpense}
        className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-2xl border border-white/[0.08] bg-[#111116] p-4"
      >
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Merchant (e.g. Zomato, Metro)"
          className="sm:col-span-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseEntry["category"])}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
        >
          <option>Food & Dining</option>
          <option>Transport</option>
          <option>Subscriptions</option>
          <option>Shopping</option>
          <option>Utilities</option>
          <option>Entertainment</option>
          <option>Travel</option>
        </select>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (INR)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400 cursor-pointer"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Log Expense
        </button>
      </form>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-1">
              <div className="text-xs text-zinc-400">{data.periodLabel} Total Spend</div>
              <div className="text-2xl font-bold font-mono text-white">
                {data.currency} {data.totalSpent.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-500">{data.expenses.length} transactions analyzed</div>
            </div>

            {data.savingsSuggestions.map((s, i) => (
              <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4" />
                    {s.title}
                  </span>
                  <span className="font-mono">+{data.currency} {s.estimatedMonthlySavings}/mo</span>
                </div>
                <p className="text-[11px] text-zinc-300">{s.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Category Breakdown */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Category Breakdown</h2>
              <div className="space-y-3">
                {data.categoryTotals.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300">{cat.category}</span>
                      <span className="font-mono text-zinc-200">
                        {data.currency} {cat.amount.toLocaleString()} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {data.unusualExpenses.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Unusual Expense Spikes
                  </div>
                  {data.unusualExpenses.map((u, idx) => (
                    <div key={idx} className="text-[11px] text-zinc-400">
                      <span className="text-zinc-200 font-medium">{u.merchant}</span> ({data.currency}{" "}
                      {u.amount.toLocaleString()}) — {u.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transaction Ledger */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-medium text-zinc-200">{exp.merchant}</div>
                      <div className="text-[10px] text-zinc-500">
                        {exp.date} • {exp.category}
                      </div>
                    </div>
                    <span className="font-mono text-zinc-200">
                      {exp.currency} {exp.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

