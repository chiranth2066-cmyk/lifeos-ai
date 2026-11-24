"use client";

import React, { useEffect, useState } from "react";
import { ShoppingBag, Star, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import type { ApprovalRecord } from "@/types/database";
import type { ProductComparisonItem, ShoppingResult } from "@/types/modules";

interface ShoppingAssistantViewProps {
  initialResult?: ShoppingResult | null;
  onApprovalCreated: (approval: ApprovalRecord) => void;
}

export function ShoppingAssistantView({
  initialResult,
  onApprovalCreated,
}: ShoppingAssistantViewProps) {
  const [query, setQuery] = useState(initialResult?.query || "Laptop for programming and gaming");
  const [budgetLimit, setBudgetLimit] = useState(initialResult?.budgetLimit || 80000);
  const [localResult, setLocalResult] = useState<ShoppingResult | null>(null);
  const result = localResult ?? initialResult ?? null;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (result) return;
    let active = true;
    (async () => {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "shopping",
          query: "Laptop for programming and gaming",
          budgetLimit: 80000,
          currency: "INR",
        }),
      });
      const json = await res.json();
      if (active && res.ok && json.data) setLocalResult(json.data);
    })();
    return () => {
      active = false;
    };
  }, [result]);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "shopping",
          query,
          budgetLimit: Number(budgetLimit),
          currency: "INR",
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) setLocalResult(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function requestPurchaseApproval(product: ProductComparisonItem) {
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "create_approval",
        actionType: "product_purchase_redirect",
        title: `Approve product selection: ${product.name}`,
        summary: `Value Score ${product.valueScore}/100 • Merchant: ${product.merchant}`,
        provider: product.merchant,
        isMockProvider: product.isMock,
        totalCost: product.price,
        currency: product.currency,
        recipientOrBooking: product.merchant,
        payload: {
          productId: product.id,
          merchantUrl: product.merchantUrl,
        },
      }),
    });
    const json = await res.json();
    if (res.ok && json.approval) onApprovalCreated(json.approval);
  }

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-violet-400" />
            AI Shopping Assistant
          </h1>
          <p className="text-xs text-zinc-400">
            Specification benchmarks, review scoring, and value-ranked product comparison.
          </p>
        </div>
        {result && (
          <div className="flex gap-1.5">
            {result.dataSources.map((s, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-[10px] text-zinc-400"
              >
                {s.isMock ? "Mock: " : "Live: "}
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={runSearch}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-white/[0.08] bg-[#111116] p-4"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What product are you looking for?"
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
        />
        <input
          type="number"
          value={budgetLimit}
          onChange={(e) => setBudgetLimit(Number(e.target.value))}
          className="w-full sm:w-40 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 cursor-pointer"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Compare Options
        </button>
      </form>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {result.products.map((product) => {
            const isTop = product.id === result.recommendedProductId;
            return (
              <div
                key={product.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                  isTop
                    ? "border-indigo-500/40 bg-indigo-500/[0.05]"
                    : "border-white/[0.08] bg-[#111116]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {product.brand}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                    </div>
                    {isTop && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 shrink-0">
                        Best Value
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {product.currency} {product.price.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {product.rating} ({product.reviewCount})
                    </span>
                  </div>

                  <div className="rounded-xl bg-black/30 border border-white/[0.06] p-3 space-y-1.5">
                    {Object.entries(product.specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-[11px]">
                        <span className="text-zinc-500">{k}</span>
                        <span className="text-zinc-200 text-right">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-[11px]">
                    {product.pros.map((p, i) => (
                      <div key={i} className="text-emerald-300/90">+ {p}</div>
                    ))}
                    {product.cons.map((c, i) => (
                      <div key={i} className="text-zinc-400">- {c}</div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => requestPurchaseApproval(product)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Approve & Proceed to Merchant
                  </button>
                  <a
                    href={product.merchantUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Preview on {product.merchant} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

