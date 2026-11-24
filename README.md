# LifeOS AI — Personal Digital Agent

> **"Tell your AI what you want. Let it figure out how to get it done."**

LifeOS AI is a modular, full-stack multi-agent personal digital assistant built with **Next.js (App Router)**, **React**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Supabase (PostgreSQL + Auth + RLS)**, and **Google Gemini AI**.

Unlike traditional chatbots that only output text, LifeOS AI plans multi-step workflows, dispatches specialized agents to research and compare options, presents structured recommendations, and enforces an explicit **Human Approval Gate** before executing sensitive or irreversible actions.

---

## Architecture Overview

- **Frontend (`src/components/`, `src/app/`)**: Dark-first Linear/Raycast-inspired workspace featuring the Command Center Dashboard, AI Chat Console (with Voice input/output and document attachment previews), Live Task Execution split view, Human Approval Modal, and 5 specialized module views.
- **Multi-Agent Engine (`src/lib/agents/`)**:
  - `Intent Agent` (`intent-agent.ts`): Extracts objective, module, constraints, and missing info via structured JSON outputs.
  - `Planning Agent` (`planning-agent.ts`): Generates ordered subtasks with dependencies and approval checkpoints.
  - `Research Agent` (`research-agent.ts`): Calls live or clearly labeled mock tools.
  - `Comparison Agent` (`comparison-agent.ts`): Ranks options by price, value score, ratings, and constraints.
  - `Execution Agent` & `Verification Agent` (`execution-agent.ts`): Executes **only** user-approved actions with idempotency keys and verifies returned reference IDs.
  - `Memory Agent` (`memory-agent.ts`): Recalls and persists user preferences and constraints.
  - `Orchestrator` (`orchestrator.ts`): Central controller streaming real backend SSE events and honoring pause/resume/cancel controls.
- **Tool & Integration Layer (`src/lib/tools/`)**:
  - Weather (`weather.ts`): **Live Open-Meteo API** (no key required) with clearly labeled mock fallback if offline.
  - Maps (`maps.ts`): **Live OpenStreetMap Nominatim** geocoding + Google Maps links.
  - Web Search (`web-search.ts`): **Live Tavily / Serper** when API key configured, otherwise clearly labeled Mock Sandbox.
  - Travel, Shopping, Scheduler, Email, Finance (`travel.ts`, `shopping.ts`, `calendar.ts`, `email.ts`, `finance.ts`): Clearly labeled sandbox/mock providers ready to swap with real merchant/booking/OAuth integrations.
- **Database & Security (`supabase/migrations/001_initial_schema.sql`, `src/lib/security/index.ts`)**:
  - All 10 tables (`users`, `user_preferences`, `conversations`, `messages`, `tasks`, `task_steps`, `approvals`, `integrations`, `activity_logs`, `memories`) with Row Level Security (RLS).
  - Rate limiting, Zod schema validation, prompt-injection detection, external content sanitization, approval expiration, and idempotent execution guards.

---

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Connect your Supabase project.
   - `GEMINI_API_KEY`, `GEMINI_MODEL`: Enable live Google Gemini structured JSON reasoning.
   - `TAVILY_API_KEY` or `SERPER_API_KEY` (optional): Enable live web search citations.
   - `LIFEOS_ALLOW_LOCAL_SANDBOX=true`: Allows immediate local testing using an isolated in-memory sandbox when Supabase is not yet configured.

3. **Apply Supabase PostgreSQL Schema & RLS**
   Run the SQL migration in `supabase/migrations/001_initial_schema.sql` inside your Supabase SQL Editor (or via Supabase CLI).

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

5. **Production Build & Lint**
   ```bash
   npm run lint
   npm run build
   ```
