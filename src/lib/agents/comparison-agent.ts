import type { ComparisonOption, ComparisonResult } from "@/types/agent";
import type { ResearchBundle } from "./research-agent";

export async function runComparisonAgent(research: ResearchBundle): Promise<ComparisonResult> {
  if (research.module === "travel" && research.travel) {
    const t = research.travel;
    const options: ComparisonOption[] = t.hotels.map((hotel, idx) => {
      const transport = t.transports[idx % t.transports.length];
      const comboCost = hotel.totalNightsPrice + transport.totalPrice;
      const fits = comboCost <= t.budgetLimit * 0.72;
      return {
        id: `${transport.id}__${hotel.id}`,
        title: `${hotel.name} + ${transport.carrier}`,
        subtitle: `${hotel.area} • ${transport.duration}`,
        price: comboCost,
        currency: t.currency,
        rating: Number(((hotel.rating + transport.rating) / 2).toFixed(1)),
        score: fits ? 95 - idx * 4 : 76 - idx * 4,
        pros: [
          `Total core stay + travel: ${t.currency} ${comboCost.toLocaleString()}`,
          `${hotel.distanceToCenter}`,
          `Amenities: ${hotel.amenities.slice(0, 3).join(", ")}`,
        ],
        cons: [fits ? "Mock provider estimate — verify live fare" : "Leaves tighter margin for activities/food"],
        provider: `${hotel.provider} + ${transport.provider}`,
        isMock: true,
        bookingUrl: hotel.bookingUrl,
      };
    });

    const recommendedId = `${t.selectedTransportId}__${t.selectedHotelId}`;
    return {
      category: `Travel Packages to ${t.destination}`,
      criteria: ["Budget Fit", "Rating", "Proximity", "Transit Convenience"],
      rankedOptions: options.sort((a, b) => b.score - a.score),
      recommendedOptionId: recommendedId,
      rationale: `Balanced total cost (${t.currency} ${t.budgetBreakdown.totalEstimated.toLocaleString()}) within your ${t.currency} ${t.budgetLimit.toLocaleString()} limit while maximizing ratings.`,
    };
  }

  if (research.module === "shopping" && research.shopping) {
    const s = research.shopping;
    return {
      category: `Product Comparison: ${s.query}`,
      criteria: ["Value Score", "Price", "Specs", "User Reviews"],
      rankedOptions: s.products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.brand} • ${p.reviewCount} reviews`,
        price: p.price,
        currency: p.currency,
        rating: p.rating,
        score: p.valueScore,
        pros: p.pros,
        cons: p.cons,
        provider: p.merchant,
        isMock: p.isMock,
        bookingUrl: p.merchantUrl,
      })),
      recommendedOptionId: s.recommendedProductId,
      rationale: s.comparisonHighlights[0] || "Ranked by specification-to-price value score.",
    };
  }

  if (research.module === "scheduler" && research.scheduler) {
    const sc = research.scheduler;
    return {
      category: `Schedule Optimization (${sc.date})`,
      criteria: ["Conflict Resolution", "Focus Continuity", "Energy Alignment"],
      rankedOptions: sc.proposedSchedule.map((ev, idx) => ({
        id: ev.id,
        title: ev.title,
        subtitle: `${ev.startIso.slice(11, 16)} – ${ev.endIso.slice(11, 16)} (${ev.category})`,
        price: 0,
        currency: "INR",
        rating: 5 - idx * 0.2,
        score: 96 - idx * 5,
        pros: [`Priority: ${ev.priority}`, "Zero overlap with existing meetings"],
        cons: ["Requires approval before adding to calendar"],
        provider: sc.provider,
        isMock: sc.isMock,
      })),
      recommendedOptionId: sc.proposedSchedule[0]?.id || null,
      rationale: sc.priorities.join(" "),
    };
  }

  if (research.module === "email" && research.email) {
    const em = research.email;
    return {
      category: "Priority Unanswered Emails",
      criteria: ["Urgency", "Action Required", "Sender Priority"],
      rankedOptions: em.threads.map((th, idx) => ({
        id: th.id,
        title: th.subject,
        subtitle: `From ${th.from} • Urgency: ${th.urgency}`,
        price: 0,
        currency: "INR",
        rating: th.urgency === "high" ? 5 : 4.2,
        score: th.urgency === "high" ? 95 - idx * 2 : 82 - idx * 2,
        pros: [th.summary, th.followUpAction || "Reply draft prepared"],
        cons: ["Awaiting explicit user send approval"],
        provider: em.provider,
        isMock: em.isMock,
      })),
      recommendedOptionId: em.threads[0]?.id || null,
      rationale: `Prioritized ${em.unansweredImportantCount} high/medium urgency unanswered threads with ready-to-review drafts.`,
    };
  }

  return {
    category: "Research Comparison",
    criteria: ["Relevance", "Actionability"],
    rankedOptions: (research.webSearch?.data || []).map((hit, idx) => ({
      id: `hit-${idx}`,
      title: hit.title,
      subtitle: hit.source,
      price: 0,
      currency: "INR",
      rating: 4.5,
      score: 90 - idx * 5,
      pros: [hit.snippet],
      cons: hit.isMock ? ["Sandbox mock search citation"] : [],
      provider: hit.source,
      isMock: hit.isMock,
      bookingUrl: hit.url,
    })),
    recommendedOptionId: "hit-0",
    rationale: research.highlights[0] || "Synthesized best available options.",
  };
}

