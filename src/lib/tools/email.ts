import type { EmailAssistantResult, EmailThreadItem } from "@/types/modules";

const globalEmailStore = globalThis as unknown as {
  __lifeosEmails?: Map<string, EmailThreadItem[]>;
};

function getEmailMap(): Map<string, EmailThreadItem[]> {
  if (!globalEmailStore.__lifeosEmails) {
    globalEmailStore.__lifeosEmails = new Map();
  }
  return globalEmailStore.__lifeosEmails;
}

export function getUserEmails(userId: string): EmailThreadItem[] {
  const map = getEmailMap();
  if (!map.has(userId)) {
    map.set(userId, [
      {
        id: "mail-1",
        from: "Priya Nair",
        fromEmail: "priya.nair@northstarstudio.in",
        subject: "Q4 Product Launch Timeline & Approval Needed",
        receivedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
        category: "important",
        unanswered: true,
        urgency: "high",
        snippet: "Hi, could you confirm whether Friday 4 PM works for the launch readiness sign-off?",
        summary: "Priya needs confirmation on the Friday 4:00 PM launch readiness review and final copy deck.",
        suggestedReply:
          "Hi Priya,\n\nThanks for following up. Friday at 4:00 PM works well for me for the launch readiness sign-off. I'll review the copy deck beforehand and share any notes.\n\nBest regards",
        followUpAction: "Schedule 4 PM Friday launch review on calendar",
        isMock: true,
      },
      {
        id: "mail-2",
        from: "Rohan Mehta (Tax & Advisory)",
        fromEmail: "rohan@mehtaca.in",
        subject: "Action Required: Quarterly GST & Invoice Reconciliation",
        receivedAt: new Date(Date.now() - 18 * 3600_000).toISOString(),
        category: "finance",
        unanswered: true,
        urgency: "high",
        snippet: "Please share October SaaS expense receipts before Wednesday to finalize filing.",
        summary: "Tax advisor requesting October SaaS & travel receipts before Wednesday EOD.",
        suggestedReply:
          "Hi Rohan,\n\nThanks for the reminder. I am compiling the October SaaS and travel receipts today and will send over the consolidated folder by tomorrow afternoon.\n\nBest regards",
        followUpAction: "Export October expense summary from Finance Organizer",
        isMock: true,
      },
      {
        id: "mail-3",
        from: "CloudCompute Billing",
        fromEmail: "billing@cloudcompute.example",
        subject: "Monthly Invoice #CC-8821 Available",
        receivedAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
        category: "newsletter",
        unanswered: false,
        urgency: "low",
        snippet: "Your monthly statement of ₹2,499 has been generated.",
        summary: "Automated monthly cloud billing notification (no reply needed).",
        suggestedReply: "",
        isMock: true,
      },
      {
        id: "mail-4",
        from: "Ananya Verma",
        fromEmail: "ananya@designcollective.co",
        subject: "Re: Weekend Goa Trip Stay Shortlist",
        receivedAt: new Date(Date.now() - 7 * 3600_000).toISOString(),
        category: "personal",
        unanswered: true,
        urgency: "medium",
        snippet: "Hey! Did you finalize the dates and North vs South Goa preference?",
        summary: "Ananya is waiting on your confirmed Goa dates and neighborhood preference.",
        suggestedReply:
          "Hey Ananya!\n\nYes, looking at North Goa (Baga/Anjuna) for a 3-day trip keeping the overall budget under ₹15,000 for both of us. Let me share the shortlisted stay & bus options tonight.\n\nCheers",
        isMock: true,
      },
    ]);
  }
  return map.get(userId)!;
}

export function markEmailReplied(userId: string, emailId: string): EmailThreadItem | null {
  const list = getUserEmails(userId);
  const idx = list.findIndex((m) => m.id === emailId);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], unanswered: false };
  return list[idx];
}

export function analyzeInbox(userId: string, filterQuery?: string): EmailAssistantResult {
  const all = getUserEmails(userId);
  const q = (filterQuery || "").toLowerCase();
  const threads = all.filter((m) => {
    if (!q || q.includes("unanswered") || q.includes("important")) {
      return m.unanswered;
    }
    return (
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  });

  const finalThreads = threads.length > 0 ? threads : all.filter((m) => m.unanswered);

  return {
    totalScanned: all.length,
    unansweredImportantCount: all.filter((m) => m.unanswered && m.urgency !== "low").length,
    threads: finalThreads,
    provider: "Local Email Inbox Sandbox (Mock)",
    isMock: true,
  };
}

