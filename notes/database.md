Below is a **comprehensive end‑to‑end overview** of the pilot system you described ( _Event → Sponsor → Company → Persona → Outreach → Meeting_ ), integrating: architecture, data flows, components (scraping, enrichment, LLM/agents), storage (PostgreSQL schema you accepted), scheduling, observability, security, scaling, and an implementation roadmap. Treat this as a **Solution Architecture Document (SAD) v1** you can hand to engineering.

---

## 1. Problem Statement & Goals

You need a pilot platform (≤4 weeks) that continuously discovers relevant upcoming events in selected cities, extracts past & current sponsors, expands to similar companies, maps decision‑maker personas, and automates multichannel outreach (LinkedIn + email) to drive _booked meetings_. A lightweight dashboard must show funnel metrics (events → sponsors/targets → contacts → messages sent → replies → meetings).

**Constraints / Priorities (Pilot)**

- Accuracy “good enough” (no manual curation at scale; allow re‑scrape loops).
- 50 (±) events across 3–4 cities, 6‑month window.
- Limited seats for LinkedIn automation (1–2).
- Reuse SaaS where faster than custom (Apollo, Mailgun/SMTP, ScrapingBee, Expandi/HeyReach).
- Keep architecture simple, but leave hooks for later multi‑tenant & scaling.

---

## 2. High‑Level Capability Map

| Capability                          | Purpose                                                 | Components                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Event Discovery**                 | Find candidate conferences & qualify them               | Perplexity (NL discovery) + SERP / ScrapingBee + (optional) PredictHQ enrichment                                               |
| **Event Normalization & Dedupe**    | Turn messy scrape output into structured, unique events | Normalizer service + PostgreSQL (`event_candidate` → `event` + `event_source`) + LLM JSON validation                           |
| **Sponsor Extraction**              | Enumerate sponsors & tiers                              | Playwright / ScrapingBee pipelines + sponsor parser                                                                            |
| **Company Enrichment & Similarity** | Clean & expand target list                              | Apollo API (firmographics), internal embedding service (pgvector), similar‑company generation                                  |
| **Persona Mapping**                 | Identify influencers & decision makers                  | Apollo People API / LinkedIn scraper (RelevanceAI or Browserflow) + role classifier LLM                                        |
| **Outreach Orchestration**          | Multi‑step sequences (email + LI)                       | Sequence engine (scheduler worker), Mailgun SMTP, LinkedIn automation (Expandi/HeyReach), template renderer + LLM personalizer |
| **Meeting Capture**                 | Surface success (bookings)                              | Cal.com webhooks → meeting ingestor → DB (`meeting*`)                                                                          |
| **Analytics & Dashboard**           | Track funnel KPIs                                       | REST/GraphQL API + React (or simple Next.js) front-end + aggregated SQL / materialized views                                   |
| **Operations & Monitoring**         | Reliability & cost visibility                           | Job queue (BullMQ / Redis), scrape job logs, metrics (Prometheus), alerting (PagerDuty/Slack)                                  |

---

## 3. Logical Architecture (Layered)

```
[ Presentation & Dashboard ]
        |  (Web front-end)
        v
[ API Gateway / BFF ]  <-- Auth (JWT/Session) & RBAC
        |
        +-- REST/GraphQL for UI
        +-- Webhooks (Cal.com, outreach vendors)
        |
        v
[ Domain Services ]
  - Event Service
  - Sponsor Service
  - Company & Similarity Service
  - Persona Service
  - Outreach Service
  - Meeting Service
  - Reporting Service
        |
        v
[ Data & Intelligence Layer ]
  PostgreSQL (normalized schema)
  Redis (queues, short-lived cache)
  Object Storage (S3 / compatible) -> raw HTML, screenshots
  Vector Index (pgvector in Postgres)
  LLM Providers (OpenAI / Perplexity / Gemini)
  External APIs (Apollo, Mailgun, Expandi, ScrapingBee)
        |
        v
[ Ingestion & Automation ]
  - Scrape Workers (Playwright cluster or ScrapingBee calls)
  - Enrichment Workers (Apollo, embeddings)
  - LLM Workers (templating, classification)
  - Scheduler (cron / queue dispatch)
```

---

## 4. Data Flow (Event to Meeting)

**Step 1: Event Discovery**

1. Scheduled “Discovery Job” runs nightly.
2. LLM (Perplexity) seeded with city + date range → returns candidate JSON (events w/ name, dates, URL).
3. SERP/API fallback (SerpAPI / Eventbrite / manual curated seed) for coverage gaps.
4. Insert each into `event_candidate` (status = scraped) + store raw payload.

**Step 2: Validation & Dedupe**
5\. Normalization worker cleans title (strip year variations), resolves dates (local → UTC), geocodes venue (OpenStreetMap / Mapbox).
6\. Hash `(normalized_name, start_dt::date, city_id)`; if not present create `event`, else attach new `event_source`.
7\. Promotion sets `event_candidate.status = promoted`.

**Step 3: Sponsor Profiling**
8\. Sponsor pages queued (priority).
9\. Playwright / ScrapingBee fetch → HTML stored as `job_artifact`.
10\. LLM extraction prompt (strict JSON schema) → list of sponsor names & tiers → fuzzy match / create `company` records; insert `event_sponsor`.

**Step 4: Company Expansion & Similarity**
11\. For each sponsor, if missing enrichment (<24h), queue Apollo enrichment (industry, size, domain).
12\. Embed (name + description) → pgvector; nearest neighbor search to produce N similar companies not already sponsors; populate `company_similarity` & queue them as target companies (marked as `origin = similarity`).
13\. (Optional) Filter out companies failing ICP rules (size / region) using `company_filter_json`.

**Step 5: Persona Mapping**
14\. For each new target `company`, queue persona search job.
15\. Apollo People API (or LinkedIn search scraping) returns raw people; store/create `person + contact_channel`.
16\. Role classifier LLM maps titles to `role_category` & sets `is_decision_maker` threshold (scoring prompt).
17\. Insert into `company_person_role`; update freshness timestamps.

**Step 6: Outreach Materialization**
18\. User (or rule) creates an `outreach_sequence` for an event (e.g. “TravelTech Summit Sponsors – Partnerships”).
19\. System expands templates into `outreach_message_instance` for each selected persona (status = pending).
20\. Rendering worker: merges templated tokens ({{first\_name}}, {{event\_name}}, value props).
21\. Optional personalizer LLM call uses last 1–2 company sponsor context + persona role → adjusts opening line; store draft in `message_llm_version`.

**Step 7: Delivery & Tracking**
22\. Scheduler selects due messages (status pending & scheduled_at <= now).
23\. Channel dispatch:

- Email: build MIME → send via Mailgun, log delivery attempt.
- LinkedIn: push to Expandi API queue (connection or message).

24. Update `outreach_message_instance.status` to sent.
25. Inbound events:

- Email webhook (Mailgun) → classify reply intent (LLM) → mark replied; if positive intent, auto‑create meeting skeleton or alert SDR.
- LinkedIn reply (Expandi webhook) similar classification.

**Step 8: Meeting Booking**
26\. Prospect clicks scheduling link (Cal.com) → webhook posts booking payload.
27\. Meeting ingestor resolves company/person by email, inserts `meeting` + attendees.
28\. Dashboard updates conversion funnel.

---

## 5. Key Services (Responsibilities & Interfaces)

| Service           | Responsibilities                                                                  | Key External Calls          |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------- |
| Event Service     | Candidate promotion, dedupe, update tracking                                      | Geocode API, Perplexity     |
| Sponsor Service   | Sponsorship extraction & re‑validation loops                                      | ScrapingBee, Playwright     |
| Company Service   | Firmographic enrichment, embeddings, similarity expansion                         | Apollo, OpenAI embeddings   |
| Persona Service   | People search, role classification, email validation                              | Apollo, LinkedIn automation |
| Outreach Service  | Sequence definition, template render, LLM personalization, delivery orchestration | OpenAI, Mailgun, Expandi    |
| Meeting Service   | Booking ingestion, attendee linking, status sync                                  | Cal.com                     |
| Reporting Service | KPI aggregation, materialized views, cohort metrics                               | (DB only)                   |
| Job Orchestrator  | Cron -> enqueue, backoff, retry, circuit breaking                                 | Redis (BullMQ)              |

---

## 6. Storage Model Highlights

Already detailed earlier; critical operational choices:

| Aspect             | Decision (Pilot)                                                      | Rationale                                       |
| ------------------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| IDs                | BIGSERIAL (upgrade path to UUID)                                      | Speed, simplicity                               |
| Embeddings         | pgvector single table column                                          | Avoid separate vector DB overhead early         |
| Raw Artifacts      | S3 bucket path stored in `job_artifact.storage_path`                  | Keeps DB lean                                   |
| JSON Fields        | Only for raw provider payloads (`event_source.payload_json`, filters) | Avoid schema churn; later denormalize if needed |
| Partitioning       | Not needed pilot; add event date partitions if growth > 100k events   | Complexity defer                                |
| Materialized Views | `mv_funnel_daily`, `mv_event_summary`                                 | Fast dashboard loads                            |

---

## 7. Queues & Scheduling

| Queue           | Job Types                                | Concurrency                     | SLA Target        |
| --------------- | ---------------------------------------- | ------------------------------- | ----------------- |
| discovery       | event_discovery_perplexity, serp_scan    | Low (1–2) nightly               | <30m window       |
| scrape          | sponsor_page, company_site               | 5–10 (I/O bound)                | <5m per batch     |
| enrichment      | company_apollo, people_search, embedding | 5 CPU-bound                     | <10m latency      |
| outreach_render | draft_generation, personalization        | 5 (LLM rate-limited)            | <2m from schedule |
| delivery        | email_send, li_send                      | 5–10 (bounded by vendor quotas) | <5m from schedule |
| inbound_webhook | reply_classify, meeting_ingest           | 5                               | Near real-time    |
| maintenance     | recheck_connection, re_enrich_persona    | 1–2                             | Low priority      |

Retry strategy: exponential backoff (e.g. 1m, 5m, 25m) with max attempts; poison queue for manual inspection.

---

## 8. LLM / AI Usage Pattern

| Task                 | Model Class                                     | Prompt Strategy                                        | Guardrails                                              |                |                 |                      |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | -------------- | --------------- | -------------------- |
| Event discovery      | Perplexity Sonar-Pro                            | System: strict JSON schema; ask for sources            | JSON Schema validation; drop if missing required fields |                |                 |                      |
| Sponsor extraction   | GPT‑4o / Structured                             | Constrain to sponsor DOM fragment; supply examples     | Token count cap; fallback regex baseline                |                |                 |                      |
| Role classification  | Small instruct (GPT‑4o-mini / Claude Opus-lite) | Map title → category + decision_maker bool             | Confidence threshold; manual review bucket              |                |                 |                      |
| Personalization line | GPT‑4o-mini                                     | Provide company summary + event context; 1‑line output | Length check (<180 chars); profanity filter             |                |                 |                      |
| Reply intent         | GPT‑4o or local (Llama‑3 8B)                    | Few‑shot: {positive                                    | neutral                                                 | not_interested | meeting_booked} | Override via user UI |
| Similarity expansion | Embeddings + vector search                      | pre‑filter by industry & size                          | Score threshold (e.g. >0.78)                            |                |                 |                      |

---

## 9. API & Integration Touchpoints

| Integration                    | Method                   | Use                           | Notes                               |
| ------------------------------ | ------------------------ | ----------------------------- | ----------------------------------- |
| Perplexity                     | REST `/chat/completions` | Event brainstorming           | Low token cost                      |
| ScrapingBee                    | REST                     | JS & anti‑bot pages           | Rotate proxies automatically        |
| Playwright Cluster             | Internal microservice    | Complex dynamic sponsor pages | Containerized workers               |
| Apollo                         | REST GraphQL             | Company & People enrichment   | Cache responses in `company_source` |
| Mailgun                        | SMTP + Webhooks          | Email send + events           | Use subdomain `pilot-outreach.*`    |
| Expandi / HeyReach             | REST + Webhooks          | LI invites & DMs              | Rate-limit; error handling          |
| Cal.com                        | Webhooks                 | Meeting booking               | Store raw JSON                      |
| Geocoding (Mapbox / Nominatim) | REST                     | Venue coordinates             | Cache resolved venues               |

---

## 10. Security & Compliance (Pilot Scope)

| Vector              | Control                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Secrets             | Vault (.env for dev; AWS Secrets Manager prod)                                                                                  |
| DB Access           | Principle of least privilege; separate read-only reporting user                                                                 |
| PII (emails, names) | Stored in Postgres; at-rest encryption (disk); optional column‑level encryption later                                           |
| Outbound API keys   | Rotated; no keys embedded client-side                                                                                           |
| LLM Data Leakage    | Redact PII in prompts where possible (hash emails)                                                                              |
| AuthN/AuthZ         | JWT (short-lived) + refresh OR session cookies; RBAC per `internal_user.role`                                                   |
| Audit               | `audit_log` triggers for UPDATE/DELETE on key tables (company, person, outreach_message_instance)                               |
| Rate limiting       | API gateway per IP + per user quotas                                                                                            |
| Email Compliance    | SPF/DKIM/DMARC for sending domain; unsubscribe handling not critical (LinkedIn + outbound prospecting) but log suppression list |

---

## 11. Observability & Ops

| Concern       | Implementation                                                                              |
| ------------- | ------------------------------------------------------------------------------------------- |
| Metrics       | Prometheus: job durations, success/fail counts, LLM token usage                             |
| Logging       | Structured JSON (pino / Winston) → OpenSearch / CloudWatch                                  |
| Tracing       | OpenTelemetry in services (trace ID through job pipeline)                                   |
| Alerting      | Slack notif: high job failure rate > X%; queue latency > threshold                          |
| Cost Tracking | Tag external API calls; daily rollup (tokens, credits)                                      |
| QA Sandbox    | Staging env with limited external sends (dry-run flags)                                     |
| Data Quality  | Daily anomaly checks: event duplicates, sponsor delta spikes, missing decision makers ratio |

---

## 12. Failure Modes & Mitigations

| Failure                    | Impact                    | Mitigation                                                         |
| -------------------------- | ------------------------- | ------------------------------------------------------------------ |
| LLM hallucinated events    | Bad target list           | Secondary SERP verification; confidence score threshold            |
| Sponsor page layout change | Missed sponsors           | HTML diff monitor; fallback simple regex for `alt="logo"`          |
| Apollo rate limit          | Persona lag               | Throttle queue; backoff; caching; partial LinkedIn scrape fallback |
| LinkedIn automation block  | Outreach stall            | Maintain second provider (Expandi ↔ HeyReach); volume caps        |
| Email deliverability dip   | Lower replies             | Daily deliverability metrics; rotate subdomain if needed           |
| Vector index bloat         | Slower similarity queries | Periodic pruning (active companies only)                           |
| Queue backlog              | Latency                   | Autoscale workers on queue depth                                   |

---

## 13. Analytics / KPI Layer

**Core Funnel Metrics (Daily Aggregates)**

- `events_active` (upcoming within 90 days)
- `sponsors_discovered` (distinct companies)
- `similar_companies_added`
- `personas_mapped` (decision makers vs influencers)
- `messages_sent` by channel
- `reply_rate` (replies / sent)
- `positive_reply_rate` (positive / sent)
- `meetings_booked` (count, per event)
- `avg_time_to_first_reply` (sent → replied)

Materialized views updated every 15 min (or incremental updates via trigger).

---

## 14. Tech Stack Summary

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| Backend  | TypeScript (NestJS or Fastify modules)                       |
| Queue    | Redis + BullMQ                                               |
| DB       | PostgreSQL 15 + pgvector + pg_trgm                           |
| Scraping | Playwright headless (Node) + ScrapingBee                     |
| Frontend | Next.js (simple dashboard) / or Supabase + Metabase fallback |
| Infra    | Docker Compose → AWS ECS / Fargate or Railway (pilot)        |
| Auth     | JWT (Auth0 or custom simple)                                 |
| CI/CD    | GitHub Actions (lint, test, migrate, deploy)                 |
| IaC      | Terraform (optional pilot)                                   |

---

## 15. Implementation Roadmap (Condensed)

| Week | Deliverables                                                                   | Milestones                |
| ---- | ------------------------------------------------------------------------------ | ------------------------- |
| 1    | Core schema, event discovery & promotion, sponsor scraper MVP                  | 20+ validated events      |
| 2    | Company enrichment, similarity expansion, persona mapping pipeline             | 200+ personas collected   |
| 3    | Outreach engine (sequences, rendering, email & LI send), dashboard v1          | First test sequence live  |
| 4    | Meeting ingestion, analytics views, hardening (retry logic, alerts), polish UI | ≥5 booked meetings target |

Daily standups + mid‑week demo; backlog triage at end of each week.

---

## 16. Build vs Buy Justification (Pilot)

| Function               | Decision                 | Reason                                       |
| ---------------------- | ------------------------ | -------------------------------------------- |
| Event catalog core     | Hybrid (LLM + light API) | Cost control, flexible coverage              |
| Sponsor extraction     | Build (scrape + parse)   | Highly page‑specific                         |
| Company & persona data | Buy (Apollo)             | Time to value                                |
| LI automation          | Buy (Expandi/HeyReach)   | Avoid browser bot maintenance early          |
| Email sending          | Buy (Mailgun)            | Reliability, analytics                       |
| Similarity engine      | Build (pgvector)         | Lightweight; no external vector DB necessity |

---

## 17. Extension Paths Post-Pilot

| Future Feature           | Schema / Service Addition                                            |
| ------------------------ | -------------------------------------------------------------------- |
| Multi-tenant SaaS        | Add `client_account_id` foreign keys; Row Level Security policies    |
| Advanced Scoring         | Lead score fields + ML job (XGBoost) fed by engagement signals       |
| Proposal Generator       | `proposal` + `proposal_version` tables; LLM summarizing event fit    |
| Real‑time Social Signals | Add `social_post` table + ingestion workers; use for personalization |
| Self‑serve Onboarding    | Public sign‑up, domain verification, seat management                 |

---

## 18. Sample Critical Queries

**Upcoming Events for Dashboard**

```sql
SELECT e.id, e.name, e.start_dt, COUNT(DISTINCT es.company_id) sponsors
FROM event e
LEFT JOIN event_sponsor es ON es.event_id = e.id
WHERE e.start_dt BETWEEN now() AND now() + INTERVAL '90 days'
GROUP BY e.id
ORDER BY e.start_dt;
```

**Sequence Funnel**

```sql
SELECT
  s.id sequence_id,
  COUNT(*) FILTER (WHERE m.status='sent') sent,
  COUNT(*) FILTER (WHERE m.status='replied') replied,
  COUNT(*) FILTER (WHERE m.status='replied')::decimal /
    NULLIF(COUNT(*) FILTER (WHERE m.status='sent'),0) reply_rate
FROM outreach_sequence s
JOIN outreach_message_instance m ON m.sequence_id = s.id
GROUP BY s.id;
```

---

## 19. Risk Register (Pilot Focus)

| Risk                              | Likelihood | Impact | Mitigation                                        |
| --------------------------------- | ---------- | ------ | ------------------------------------------------- |
| External API quota exhaustion     | Medium     | Medium | Rate scheduling, caching                          |
| LLM cost overrun                  | Low-Med    | Medium | Token budget per job; fallback heuristics         |
| LinkedIn anti‑automation triggers | Medium     | High   | Low daily sends; randomized delays                |
| Data protection complaint (GDPR)  | Low        | High   | Honor deletion requests (person soft-delete flag) |
| Deliverability drop               | Medium     | High   | Domain warm‑up, monitoring, send throttling       |

---

## 20. Immediate Action Checklist

1. Approve **stack & week plan**.
2. Decide Expandi _vs_ HeyReach (cost vs seat scaling).
3. Provide initial **city + venue seed list**.
4. Supply Apollo API key / seat access.
5. Set up DNS for sending subdomain (`pilot-outreach.<domain>`).
6. Spin up infra (Postgres, Redis, object storage).
7. Create Perplexity & Mailgun credentials; capture in secret manager.
8. Kick off sprint 1 with schema migration + discovery worker.

---

### Summary

You now have a coherent blueprint: modular services over a normalized Postgres schema; scraping and enrichment orchestrated by queues; LLM usage constrained to well‑scoped, schema‑validated tasks; outreach automated but auditable; analytics supported by materialized views. The design intentionally separates _data acquisition_ (events, sponsors, personas) from _activation_ (outreach & meetings) so you can harden each independently and, later, open up a multi‑tenant SaaS surface with minimal rework.

---

**Next:** Tell me any areas you want deeper (e.g., detailed normalization algorithm, sponsor extraction prompt, or sequence scheduling logic) and I’ll drill down.
