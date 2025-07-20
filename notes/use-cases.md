# Pilot Admin Dashboard – Use Cases, User Flows & Frontend Scaffold (Vite + TypeScript + Bootstrap + SCSS)

> **Scope**: Minimal yet extensible admin UI with four functional areas: _Cities_, _Events_, _Sponsors_, _Leads_, _Outreach_. Backed later by micro‑services / APIs. This document gives: core use cases, user flows, data contracts, and a ready Vite + TS + Bootstrap + SCSS scaffold (with modular folder layout) you can paste in.

---

## 1. Core Modules & Main Use Cases

### 1.1 Cities

| Use Case                | Description                                          | Primary Actions                        | Notes                                                   |
| ----------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Create City             | Add reusable city (name, country, timezone, lat/lon) | _Add City_ form                        | Used to pre‑filter event discovery prompts & API calls. |
| Quick City (On‑the‑fly) | Specify a city ad‑hoc while discovering events       | Inline field on Events Discovery panel | Not persisted unless user clicks "Save as City".        |
| List Cities             | View existing cities                                 | Table, search                          | Paginate; show count of linked events.                  |
| Edit / Delete City      | Maintain data                                        | Edit modal, delete with confirm        | Prevent delete if events exist (soft disable).          |

### 1.2 Events

| Use Case               | Description                                                     | Actions                                           | Notes                                    |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Discover Events        | Invoke Perplexity / Event API with city + date range + industry | _Discover_ button → async job → results preview   | Results come back as _candidates_ first. |
| Promote Event          | Approve candidate into canonical event list                     | _Accept_ / _Reject_ on each candidate             | Persist to DB.                           |
| View Events            | Browse confirmed events                                         | Filters: city, date range, status                 | Show sponsor count, progress badges.     |
| Re-scan Event Sponsors | Trigger sponsor scrape job (per event)                          | _Rescan Sponsors_ action                          | Queue job; show job status.              |
| Event Detail           | Inspect one event                                               | Tabs: Overview, Sponsors, Leads, Outreach Metrics | Context hub.                             |

### 1.3 Sponsors

| Use Case                  | Description                         | Actions                                   | Notes                                              |
| ------------------------- | ----------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| List Sponsors (per Event) | Show extracted sponsor companies    | Table with tier, first/last seen, actions | Data originates from scrape + parsing.             |
| Trigger Sponsor Scrape    | Launch / re-run sponsor page scrape | _Scrape Now_ button                       | Displays job status and last run time.             |
| Add Manual Sponsor        | Manually add missing sponsor        | Inline row add                            | Flags `source=manual`.                             |
| Expand Similar Companies  | Generate look‑alike companies       | _Find Similar_ bulk action                | Embedding similarity job; results into Leads pool. |

### 1.4 Leads (Companies & People)

| Use Case          | Description                                              | Actions                                   | Notes                                    |
| ----------------- | -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| Enrich Company    | Pull Apollo / other enrichment                           | _Enrich_ button (single / bulk)           | Shows spinner + updated firmographics.   |
| View Leads        | Filter companies by source (sponsor, similarity), status | Company table; highlight missing personas | KPI: #decision makers found.             |
| Persona Discovery | Fetch key people per company                             | _Find Key People_ (bulk or row)           | Creates People rows with roles / emails. |
| Person Detail     | Inspect & adjust classification                          | Side drawer / modal                       | Mark decision maker override.            |

### 1.5 Outreach

| Use Case           | Description                                                    | Actions                    | Notes                                |
| ------------------ | -------------------------------------------------------------- | -------------------------- | ------------------------------------ |
| Create Sequence    | Define multistep outreach for selected event & persona filters | Sequence wizard            | Stores step templates.               |
| Preview Audience   | Show (company, person) pairs targeted                          | Dynamic compute            | Allows exclusions before generation. |
| Generate Messages  | Render personalized drafts (LLM + templates)                   | _Generate Drafts_          | Saves versions; status = Draft.      |
| Approve & Schedule | Bulk approve drafts & set schedule offsets                     | Approve action             | Moves to _Scheduled_ status.         |
| Monitor Delivery   | Track sent / replies / meetings                                | Real-time counters, charts | Poll or websocket.                   |
| Inspect Thread     | View message + attempts + reply classification                 | Conversation pane          | Manual status override.              |

---

## 2. High-Level User Flow (Happy Path)

```
[1] Add / Select City --> [2] Discover Events --> Review Candidates --> Promote
       |                                                        |
       v                                                        v
   Cities Table <-------------------------------------- Confirmed Events List
                                                     |          |
                                                     |          v
                                                     |    [3] Event Detail
                                                     |          |
                                                     |          v
                                                     |   Trigger Sponsor Scrape
                                                     |          |
                                                     |          v
                                                     |    Sponsors Extracted
                                                     |          |
                                                     |    Expand Similar Companies
                                                     |          v
                                                     |        Leads Pool
                                                     |          |
                                                     |   Enrich + Persona Mapping
                                                     |          v
                                                     |    Personas (decision makers)
                                                     |          |
                                                     +----> Create Outreach Sequence
                                                                  |
                                                                  v
                                                          Generate & Approve Messages
                                                                  |
                                                                  v
                                                             Track Replies & Meetings
```

---

## 3. Minimal Data Contracts (Frontend Types)

```ts
// cities
export interface City {
  id: string;
  name: string;
  countryCode: string;
  timezone: string;
  lat?: number;
  lon?: number;
  createdAt: string;
}

// event candidates & events
export interface EventCandidate {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  cityId?: string;
  cityName?: string;
  industry?: string;
  status: 'scraped' | 'rejected' | 'promoted';
  sources: string[];
}
export interface Event extends Omit<EventCandidate, 'status' | 'sources'> {
  status: 'planned' | 'updated' | 'canceled';
  sponsorCount: number;
}

// sponsors
export interface Sponsor {
  id: string;
  eventId: string;
  companyId: string;
  companyName: string;
  tier?: string;
  firstObserved: string;
  lastObserved: string;
  source: 'scrape' | 'manual';
}

// companies & people
export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  sizeRange?: string;
  similarityOrigin?: string;
  enrichedAt?: string;
  leadSource: 'sponsor' | 'similarity' | 'manual';
  personaCount: number;
  decisionMakers: number;
}
export interface Person {
  id: string;
  fullName: string;
  title?: string;
  roleCategory?: string;
  isDecisionMaker: boolean;
  email?: string;
  linkedin?: string;
  companyId: string;
  enrichedAt?: string;
}

// outreach
export interface OutreachSequence {
  id: string;
  name: string;
  eventId?: string;
  status: 'active' | 'paused';
  createdAt: string;
}
export interface OutreachStepTemplate {
  id: string;
  sequenceId: string;
  stepNumber: number;
  channel: 'email' | 'linkedin_conn' | 'linkedin_msg' | 'follow_up';
  dayOffset: number;
  subjectTemplate?: string;
  bodyTemplate: string;
}
export interface MessageInstance {
  id: string;
  personId: string;
  sequenceId: string;
  stepTemplateId: string;
  status: 'pending' | 'rendered' | 'scheduled' | 'sent' | 'replied' | 'bounced';
  scheduledAt?: string;
  sentAt?: string;
  replyAt?: string;
  subject?: string;
  body?: string;
}
```

---

## 4. Frontend Project Scaffold (Vite + TypeScript + Bootstrap + SCSS)

### 4.1 Commands

```bash
# create project
npm create vite@latest frontend -- --template react-ts
cd frontend

# dependencies
npm i react-router-dom axios
npm i bootstrap@5.3.3
npm i -D sass

# (Optional) state mgmt light - just context; can add Zustand later
```

### 4.2 File / Folder Structure

```
frontend/
  .env.development         # API base URLs, feature flags (DO NOT COMMIT secrets)
  index.html
  vite.config.ts
  tsconfig.json
  package.json
  src/
    main.tsx
    App.tsx
    routes.tsx
    assets/
      styles/
        _variables.scss
        _layout.scss
        index.scss
    components/
      layout/
        Sidebar.tsx
        Topbar.tsx
        PageContainer.tsx
      common/
        DataTable.tsx
        StatusBadge.tsx
        Loading.tsx
        Pagination.tsx
    modules/
      cities/
        CitiesPage.tsx
        CityForm.tsx
        api.ts
      events/
        EventsPage.tsx
        EventCandidatesPanel.tsx
        EventDetailPage.tsx
        api.ts
      sponsors/
        SponsorsPage.tsx
        SponsorTable.tsx
        api.ts
      leads/
        LeadsPage.tsx
        CompanyDetailDrawer.tsx
        PersonasPanel.tsx
        api.ts
      outreach/
        SequencesPage.tsx
        SequenceWizard.tsx
        MessagesPage.tsx
        api.ts
    lib/
      apiClient.ts
      hooks/
        useAsync.ts
        usePagination.ts
    context/
      ToastContext.tsx
    types/
      domain.ts (interfaces above)
```

### 4.3 SCSS Entry (`src/assets/styles/index.scss`)

```scss
@import 'variables'; // custom overrides BEFORE bootstrap
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/root';
@import 'bootstrap/scss/reboot';
@import 'bootstrap/scss/type';
@import 'bootstrap/scss/utilities';
@import 'bootstrap/scss/buttons';
@import 'bootstrap/scss/cards';
@import 'bootstrap/scss/nav';
@import 'bootstrap/scss/navbar';
@import 'bootstrap/scss/forms';
@import 'bootstrap/scss/tables';
@import 'bootstrap/scss/spinners';
// custom layout
@import 'layout'; // your grid / sidebar tweaks
```

`_variables.scss` (example overrides):

```scss
$primary: #4b5bdc;
$body-bg: #0f1115;
$body-color: #e4e7ef;
$card-bg: #1a1d23;
$card-border-color: #242832;
$border-radius: 0.5rem;
```

`_layout.scss` (basic sidebar layout):

```scss
.app-wrapper {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 240px;
  background: #1a1d23;
  color: #fff;
  padding: 1rem;
}
.sidebar a {
  color: #adb5bd;
  text-decoration: none;
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
}
.sidebar a.active,
.sidebar a:hover {
  background: #2a3040;
  color: #fff;
}
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  border-bottom: 1px solid #242832;
}
.page-container {
  padding: 1.25rem;
  flex: 1;
  overflow: auto;
}
```

### 4.4 Entry (`main.tsx`)

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './assets/styles/index.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

### 4.5 App & Routes (`App.tsx` / `routes.tsx`)

```tsx
// routes.tsx
import { RouteObject } from 'react-router-dom';
import CitiesPage from './modules/cities/CitiesPage';
import EventsPage from './modules/events/EventsPage';
import EventDetailPage from './modules/events/EventDetailPage';
import SponsorsPage from './modules/sponsors/SponsorsPage';
import LeadsPage from './modules/leads/LeadsPage';
import SequencesPage from './modules/outreach/SequencesPage';
import MessagesPage from './modules/outreach/MessagesPage';

export const routes: RouteObject[] = [
  { path: '/', element: <EventsPage /> },
  { path: '/cities', element: <CitiesPage /> },
  { path: '/events/:eventId', element: <EventDetailPage /> },
  { path: '/events/:eventId/sponsors', element: <SponsorsPage /> },
  { path: '/leads', element: <LeadsPage /> },
  { path: '/outreach/sequences', element: <SequencesPage /> },
  { path: '/outreach/messages', element: <MessagesPage /> },
];
```

```tsx
// App.tsx
import { useRoutes, NavLink } from 'react-router-dom';
import { routes } from './routes';

export default function App() {
  const element = useRoutes(routes);
  return (
    <div className="app-wrapper">
      <aside className="sidebar">
        <h5 className="mb-3">Pilot Admin</h5>
        <nav className="nav flex-column small">
          <NavLink to="/" end>
            Events
          </NavLink>
          <NavLink to="/cities">Cities</NavLink>
          <NavLink to="/leads">Leads</NavLink>
          <NavLink to="/outreach/sequences">Sequences</NavLink>
          <NavLink to="/outreach/messages">Messages</NavLink>
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">{/* future: search, user menu */}</header>
        <div className="page-container">{element}</div>
      </div>
    </div>
  );
}
```

### 4.6 Generic API Client (`lib/apiClient.ts`)

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  withCredentials: false,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('jwt');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
```

### 4.7 Module API Example (Events)

```ts
// modules/events/api.ts
import { api } from '../../lib/apiClient';
import { Event, EventCandidate } from '../../types/domain';

export async function fetchEvents(): Promise<Event[]> {
  const { data } = await api.get('/events');
  return data;
}
export async function fetchEventCandidates(params: {
  cityId?: string;
}): Promise<EventCandidate[]> {
  const { data } = await api.get('/events/candidates', { params });
  return data;
}
export async function discoverEvents(payload: {
  city: string;
  dateRange: string;
  industry?: string;
}) {
  const { data } = await api.post('/events/discover', payload); // triggers async job
  return data; // maybe returns job id
}
export async function promoteEvent(id: string) {
  return api.post(`/events/candidates/${id}/promote`);
}
export async function rejectCandidate(id: string) {
  return api.post(`/events/candidates/${id}/reject`);
}
```

### 4.8 Simple Page Stub (Events)

```tsx
// modules/events/EventsPage.tsx
import { useEffect, useState } from 'react';
import {
  fetchEvents,
  fetchEventCandidates,
  discoverEvents,
  promoteEvent,
  rejectCandidate,
} from './api';
import { Event, EventCandidate } from '../../types/domain';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [candidates, setCandidates] = useState<EventCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [ev, cand] = await Promise.all([
      fetchEvents(),
      fetchEventCandidates({}),
    ]);
    setEvents(ev);
    setCandidates(cand);
  }

  async function onDiscover() {
    setLoading(true);
    try {
      await discoverEvents({ city, dateRange: 'next_90_days', industry });
    } finally {
      setLoading(false);
      refresh();
    }
  }

  async function onPromote(id: string) {
    await promoteEvent(id);
    refresh();
  }
  async function onReject(id: string) {
    await rejectCandidate(id);
    refresh();
  }

  return (
    <div>
      <h4 className="mb-3">Events</h4>
      <div className="card mb-4 p-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label">City</label>
            <input
              className="form-control"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Singapore"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Industry (optional)</label>
            <input
              className="form-control"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <button
              className="btn btn-primary w-100"
              disabled={loading || !city}
              onClick={onDiscover}
            >
              {loading ? 'Running...' : 'Discover'}
            </button>
          </div>
        </div>
      </div>

      <h6>Candidate Events</h6>
      <table className="table table-sm table-striped align-middle">
        <thead>
          <tr>
            <th>Name</th>
            <th>City</th>
            <th>Start</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <td>
                <a href={c.url} target="_blank" rel="noreferrer">
                  {c.name}
                </a>
              </td>
              <td>{c.cityName || '—'}</td>
              <td>{c.startDate?.slice(0, 10)}</td>
              <td className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => onPromote(c.id)}
                >
                  Promote
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onReject(c.id)}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
          {!candidates.length && (
            <tr>
              <td colSpan={4} className="text-muted">
                No candidates
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h6 className="mt-4">Confirmed Events</h6>
      <table className="table table-sm table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Start</th>
            <th>Sponsors</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.name}</td>
              <td>{ev.startDate?.slice(0, 10)}</td>
              <td>{ev.sponsorCount}</td>
              <td>
                <span className="badge bg-secondary">{ev.status}</span>
              </td>
            </tr>
          ))}
          {!events.length && (
            <tr>
              <td colSpan={4} className="text-muted">
                No events
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 5. UX / Interaction Notes (Concise Guide)

| Section             | Primary CTA                  | Secondary                 | State Feedback                                                       |
| ------------------- | ---------------------------- | ------------------------- | -------------------------------------------------------------------- |
| Cities              | _Add City_                   | Edit/Delete               | Toast on save/delete; disable delete if linked events.               |
| Events (Discovery)  | _Discover_                   | Promote/Reject candidate  | Inline spinner; badge for job queued vs complete.                    |
| Event Detail        | _Rescan Sponsors_            | Expand Similar Companies  | Show last scrape time + status pill (Queued / Running / OK / Error). |
| Sponsors            | _Find Similar_               | Manual Add                | After expansion, highlight new companies in leads table.             |
| Leads               | _Enrich_ / _Find Key People_ | Filter (Source, Enriched) | Progress bar for batch operations.                                   |
| Outreach (Sequence) | _Generate Drafts_            | Pause Sequence            | Draft count vs audience count ratio; error count.                    |
| Messages            | _Approve & Schedule_         | Bulk select exclude       | Real-time counters for Sent / Replies / Meetings.                    |

---

## 6. Async Job Pattern (Frontend Expectations)

All long-running tasks return: `{ jobId, status: 'queued' }` → poll `/jobs/:id` until `status in ("completed","failed")`, then refresh relevant list.

**Job Status DTO**:

```ts
interface JobStatus {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  progress?: number;
  error?: string;
  resultRef?: string;
}
```

---

## 7. Auth & JWT Placeholder

Setup a login later; for now store JWT in `localStorage` (dev only). **Never commit secrets**. Provided `.env` sample:

```
VITE_API_BASE=http://localhost:4000/api
```

> The `JWT_SECRET` you mentioned must stay **server-side only**; do not expose in the frontend repository.

---

## 8. Next Implementation Steps

1. Scaffold project as above (`npm create vite@latest`).
2. Add SCSS structure & verify Bootstrap overrides.
3. Implement Cities module (list + create + delete guard).
4. Implement Events discovery + candidate promotion flows (fake API mocks first).
5. Add Sponsors tab inside EventDetail (placeholder list + Rescan action).
6. Leads table (companies) with enrichment status chips.
7. Outreach sequence wizard skeleton (multi-step form).
8. Integrate job polling component for all async operations.
9. Add toast context & error boundary.
10. Harden types & extract shared enums.

---

## 9. Future Enhancements (Not Now)

- WebSocket subscription for job status instead of polling.
- Role-based access (multi-user).
- Column persistence (user preferences) in tables.
- Dark/light theme toggle.
- Bulk CSV export of leads & message outcomes.
- Inline prompt editing for LLM personalization.

---

### Summary

This guide delivers a lean, modular frontend foundation. Start with mocked APIs; progressively hook to real services as back-end endpoints are ready. Keep domain types central (`types/domain.ts`) and enforce feature isolation under `modules/` to prevent monolith sprawl.

Let me know if you want: (a) ready Dockerfile + Nginx, (b) Zustand store, (c) sequence wizard deeper spec, or (d) Cypress test scaffolding.
