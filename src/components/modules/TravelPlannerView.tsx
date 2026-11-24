"use client";

import React, { useEffect, useState } from "react";
import {
  Plane,
  Bus,
  Train,
  Hotel,
  MapPin,
  CloudSun,
  Utensils,
  Compass,
  ShieldCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { ApprovalRecord } from "@/types/database";
import type { TravelPlanResult } from "@/types/modules";

interface TravelPlannerViewProps {
  initialPlan?: TravelPlanResult | null;
  onApprovalCreated: (approval: ApprovalRecord) => void;
}

export function TravelPlannerView({ initialPlan, onApprovalCreated }: TravelPlannerViewProps) {
  const [origin, setOrigin] = useState(initialPlan?.origin || "Bengaluru");
  const [destination, setDestination] = useState(initialPlan?.destination || "Goa");
  const [days, setDays] = useState(initialPlan?.days || 3);
  const [travelers, setTravelers] = useState(initialPlan?.travelers || 2);
  const [budgetLimit, setBudgetLimit] = useState(initialPlan?.budgetLimit || 15000);
  const [localPlan, setLocalPlan] = useState<TravelPlanResult | null>(null);
  const plan = localPlan ?? initialPlan ?? null;
  const [selectedTransportId, setSelectedTransportId] = useState<string>(initialPlan?.selectedTransportId || "");
  const [selectedHotelId, setSelectedHotelId] = useState<string>(initialPlan?.selectedHotelId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) return;
    let active = true;
    (async () => {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "travel",
          origin: "Bengaluru",
          destination: "Goa",
          days: 3,
          travelers: 2,
          budgetLimit: 15000,
          currency: "INR",
        }),
      });
      const json = await res.json();
      if (active && res.ok && json.data) {
        const result = json.data as TravelPlanResult;
        setLocalPlan(result);
        setSelectedTransportId(result.selectedTransportId);
        setSelectedHotelId(result.selectedHotelId);
      }
    })();
    return () => {
      active = false;
    };
  }, [plan]);

  async function runPlanner(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "travel",
          origin,
          destination,
          days: Number(days),
          travelers: Number(travelers),
          budgetLimit: Number(budgetLimit),
          currency: "INR",
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const result = json.data as TravelPlanResult;
        setLocalPlan(result);
        setSelectedTransportId(result.selectedTransportId);
        setSelectedHotelId(result.selectedHotelId);
      }
    } finally {
      setLoading(false);
    }
  }

  const activeTransport =
    plan?.transports.find((t) => t.id === selectedTransportId) || plan?.transports[0];
  const activeHotel = plan?.hotels.find((h) => h.id === selectedHotelId) || plan?.hotels[0];

  const dynamicTotalCost =
    plan && activeTransport && activeHotel
      ? activeTransport.totalPrice +
        activeHotel.totalNightsPrice +
        plan.budgetBreakdown.activities +
        plan.budgetBreakdown.foodAndLocalTransport
      : 0;

  async function requestBookingApproval() {
    if (!plan || !activeTransport || !activeHotel) return;
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "create_approval",
        actionType: "travel_booking_reservation",
        title: `Your ${plan.destination} trip is ready!`,
        summary: `${plan.days}-day itinerary for ${plan.travelers} traveler(s): ${activeTransport.carrier} + ${activeHotel.name}.`,
        provider: `${activeTransport.provider} & ${activeHotel.provider}`,
        isMockProvider: true,
        totalCost: dynamicTotalCost,
        currency: plan.currency,
        recipientOrBooking: `${activeHotel.name} (${activeHotel.area})`,
        payload: {
          bookingUrl: activeHotel.bookingUrl,
          transportUrl: activeTransport.bookingUrl,
          destination: plan.destination,
        },
      }),
    });
    const json = await res.json();
    if (res.ok && json.approval) {
      onApprovalCreated(json.approval);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Plane className="h-5 w-5 text-sky-400" />
            AI Travel Planner
          </h1>
          <p className="text-xs text-zinc-400">
            Transport, accommodation, weather, attractions & budget optimization with approval-gated checkout.
          </p>
        </div>
        {plan && (
          <div className="flex flex-wrap gap-1.5">
            {plan.dataSources.map((src, i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${
                  src.isMock
                    ? "bg-zinc-900 border-white/10 text-zinc-400"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                }`}
              >
                {src.isMock ? "Mock: " : "Live: "}
                {src.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Trip Parameter Form */}
      <form
        onSubmit={runPlanner}
        className="grid grid-cols-2 sm:grid-cols-6 gap-3 rounded-2xl border border-white/[0.08] bg-[#111116] p-4"
      >
        <label className="space-y-1 text-xs">
          <span className="text-zinc-400">Origin</span>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-zinc-400">Destination</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-zinc-400">Days</span>
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-zinc-400">Travelers</span>
          <input
            type="number"
            min={1}
            max={12}
            value={travelers}
            onChange={(e) => setTravelers(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-zinc-400">Budget (INR)</span>
          <input
            type="number"
            min={1000}
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(Number(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-white"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Plan Trip
          </button>
        </div>
      </form>

      {plan && (
        <>
          {/* Budget & Weather Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#111116] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-zinc-400">Optimized Estimated Trip Cost</div>
                <div className="text-2xl font-bold font-mono text-white">
                  {plan.currency} {dynamicTotalCost.toLocaleString()}
                  <span
                    className={`ml-2 text-xs font-sans font-medium ${
                      dynamicTotalCost <= plan.budgetLimit ? "text-emerald-400" : "text-amber-300"
                    }`}
                  >
                    ({dynamicTotalCost <= plan.budgetLimit ? "Within" : "Above"} {plan.currency}{" "}
                    {plan.budgetLimit.toLocaleString()} budget)
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400 pt-1">
                  <span>Transport: {plan.currency} {(activeTransport?.totalPrice || 0).toLocaleString()}</span>
                  <span>Stay: {plan.currency} {(activeHotel?.totalNightsPrice || 0).toLocaleString()}</span>
                  <span>Activities: {plan.currency} {plan.budgetBreakdown.activities.toLocaleString()}</span>
                  <span>Food/Local: {plan.currency} {plan.budgetBreakdown.foodAndLocalTransport.toLocaleString()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={requestBookingApproval}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 shrink-0 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                Approve & Continue to Booking
              </button>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4 text-amber-300" />
                  {plan.weather.location}
                </span>
                <span className="text-[10px] text-zinc-500">{plan.weather.isMock ? "Mock" : "Live"}</span>
              </div>
              <div className="text-xl font-semibold text-white">
                {plan.weather.temperatureC}°C • {plan.weather.condition}
              </div>
              <div className="text-[11px] text-zinc-400">
                {plan.weather.forecast
                  .slice(0, 3)
                  .map((f) => `${f.date.slice(5)}: ${f.tempMaxC}°/${f.tempMinC}°`)
                  .join(" • ")}
              </div>
            </div>
          </div>

          {/* Transport & Hotels Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Transportation Options (Select One)</h2>
              <div className="space-y-2.5">
                {plan.transports.map((tr) => {
                  const selected = tr.id === selectedTransportId;
                  return (
                    <div
                      key={tr.id}
                      onClick={() => setSelectedTransportId(tr.id)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                        selected
                          ? "border-indigo-500/50 bg-indigo-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {tr.mode === "flight" ? (
                            <Plane className="h-4 w-4 text-sky-400" />
                          ) : tr.mode === "bus" ? (
                            <Bus className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Train className="h-4 w-4 text-emerald-400" />
                          )}
                          <span className="text-xs font-semibold text-white">{tr.carrier}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-300">
                          {tr.currency} {tr.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          {tr.route} • {tr.duration}
                        </span>
                        <a
                          href={tr.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-indigo-300 hover:underline"
                        >
                          Provider <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white">Accommodation Options (Select One)</h2>
              <div className="space-y-2.5">
                {plan.hotels.map((ht) => {
                  const selected = ht.id === selectedHotelId;
                  return (
                    <div
                      key={ht.id}
                      onClick={() => setSelectedHotelId(ht.id)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                        selected
                          ? "border-indigo-500/50 bg-indigo-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Hotel className="h-4 w-4 text-violet-400" />
                          <span className="text-xs font-semibold text-white">{ht.name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-300">
                          {ht.currency} {ht.totalNightsPrice.toLocaleString()} total
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          {ht.area} • ★ {ht.rating} • {ht.distanceToCenter}
                        </span>
                        <a
                          href={ht.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-indigo-300 hover:underline"
                        >
                          Provider <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Day-wise Itinerary */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Day-wise Optimized Itinerary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plan.itinerary.map((day) => (
                <div
                  key={day.day}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
                >
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-indigo-400">Day {day.day}</div>
                    <div className="text-xs font-semibold text-white">{day.title}</div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    {day.activities.map((act, i) => (
                      <div key={i} className="text-zinc-300">
                        <span className="font-mono text-zinc-500">{act.time}</span> — {act.activity}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.06] pt-2 space-y-1 text-[11px] text-zinc-400">
                    {day.meals.map((m, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {m.meal}: {m.suggestion}
                        </span>
                        <span className="font-mono">{plan.currency} {m.estimatedCost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Restaurants & Attractions with Maps Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5 text-amber-400" />
                Recommended Restaurants
              </h3>
              {plan.restaurants.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-white/[0.04] pb-2">
                  <div>
                    <div className="font-medium text-zinc-200">{r.name}</div>
                    <div className="text-[11px] text-zinc-500">
                      {r.area} • {r.notes}
                    </div>
                  </div>
                  <a
                    href={r.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:underline shrink-0"
                  >
                    <MapPin className="h-3 w-3" /> Map
                  </a>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-5 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-sky-400" />
                Attractions & Landmarks
              </h3>
              {plan.attractions.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-white/[0.04] pb-2">
                  <div>
                    <div className="font-medium text-zinc-200">{a.name}</div>
                    <div className="text-[11px] text-zinc-500">
                      {a.area} • {a.notes}
                    </div>
                  </div>
                  <a
                    href={a.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:underline shrink-0"
                  >
                    <MapPin className="h-3 w-3" /> Map
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

