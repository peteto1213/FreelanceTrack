# FreelanceTrack — Project Specification for Cursor

> **Purpose**: This document is the single source of truth for building the FreelanceTrack application.  
> Follow it strictly. Prefer small, incremental, working commits. Keep the scope focused and production-quality.

---

## 1. Project Overview

**FreelanceTrack** is a personal assistant web application for freelancers to:

- Record client session timeslots in a calendar view
- Track service type, company name, and expected session fee
- View monthly earnings dashboards with breakdowns by company
- Authenticate via simple JWT-based login (no registration)

**Target audience**: Freelancers who want a clean, modern tool to manage billable sessions and revenue visibility.

**Key Interview Goals** (keep these in mind at all times):
- Demonstrate effective use of AI (Cursor) to deliver a working result efficiently
- Clean architecture, readable code, good Docker setup
- Working end-to-end product with clear documentation

---

## 2. Tech Stack (Fixed)

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Frontend       | Vite + React 18 + TypeScript                    |
| Styling        | Tailwind CSS + shadcn/ui (modern dark-blue theme) |
| State / Data   | React Query (TanStack Query) + Zustand (auth)   |
| Routing        | React Router v6                                 |
| Calendar       | `react-big-calendar` + `date-fns`               |
| Backend        | Node.js + Express + TypeScript                  |
| Database       | MongoDB (via Mongoose)                          |
| Auth           | JWT (jsonwebtoken) + bcryptjs                   |
| Logging        | Pino (structured JSON logs)                     |
| Container      | Docker + Docker Compose                         |
| Monorepo       | Single repository with `/client` and `/server`  |

---

## 3. Project Structure (Monorepo)

```
FreelanceTrack/
├── client/                     # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                     # Express + TypeScript
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   │   └── logger.ts       # JSON structured logger
│   │   ├── app.ts
│   │   └── server.ts
│   ├── logs/                   # JSON log files (volume mounted)
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
├── SETUP.md                    # Detailed local + Docker setup
├── README.md                   # Project overview + cloud deployment notes
└── .gitignore
```

---

## 4. Core Features & Requirements

### 4.1 Authentication
- Simple login only (no registration)
- Credentials stored in server `.env`:
  ```
  ADMIN_USER=yourusername
  ADMIN_PASS=yourpassword
  JWT_SECRET=your_jwt_secret
  JWT_EXPIRES_IN=7d
  ```
- Backend validates against these env vars and issues a JWT
- Frontend stores JWT (preferably in memory + httpOnly cookie or secure localStorage with care)
- All protected routes on frontend redirect to `/login` if not authenticated
- Backend protects all `/api/*` routes (except `/api/auth/login`) with JWT middleware

### 4.2 Companies and service types
- A company owns one or more service types.
- The same service type name may exist under more than one company. Each company–service pair has its own `expectedFee`.
- The Companies screen is a separate navigation tab. From that screen the user can create, rename, and delete companies, and create, edit, and delete the service types under a company.
- Deleting a company or a service type is refused while any session still references it. Existing sessions keep the company name, service type name, and fee they stored when they were saved.
- Changing a pair’s fee or renaming a company or service type does not rewrite existing sessions. Sessions created after the change use the new values.
- Service type names are unique within a company. Company names are unique in the app.

### 4.3 Session Management (Calendar)
- **Month view only** (default view = current day / today)
- Each session contains:
  - `startTime` (DateTime)
  - `endTime` (DateTime)
  - `companyId` and `serviceTypeId` (references to the catalog)
  - `companyName`, `serviceType`, and `expectedFee` copied from that pair when the session is created
  - `notes` (optional string)
- The session form asks for a company, then a service type that belongs to that company. The fee is shown and cannot be typed. The saved session keeps that fee even if the catalog fee changes later.
- Editing a session and choosing a different service type copies that pair’s current name and fee. Saving without changing the pair leaves the stored name and fee as they were.
- Multiple sessions allowed on the same day
- Full CRUD:
  - Create session (modal or side panel)
  - Edit session
  - Delete session (with confirmation)
- Calendar should support clicking a day or existing event to open create/edit form

### 4.4 Dashboard
- User can select any month + year
- Summary cards:
  - Total Expected Earnings (sum of expectedFee)
  - Number of Sessions
  - Average Fee per Session
  - Top Client (company with highest total expected fee)
- Detailed breakdown:
  - Grouped by company
  - Under each company: list of sessions (date, service type, fee, time range)
- Clean, modern card-based UI

### 4.5 Logger (Critical)
Create a structured JSON logger (use **Pino** recommended).

Every log entry should be valid JSON and follow a style similar to:

```json
{
  "runId": "2026111617000000ABC123",
  "jobType": "sessionCreate",
  "startedAt": "2026-11-16T09:00:00.123Z",
  "finishedAt": "2026-11-16T09:00:00.456Z",
  "durationMs": 333,
  "logType": "INFO",
  "message": "Session created successfully",
  "userId": "admin",
  "sessionId": "674a1b2c3d4e5f6789012345",
  "companyName": "Acme Corp",
  "expectedFee": 1500
}
```

Requirements:
- Support log levels: DEBUG, INFO, WARN, ERROR
- Include `runId` (unique per request or operation)
- Include timestamps in ISO format
- Calculate `durationMs` when relevant
- Write logs both to console (pretty in dev) and to rotating JSON files in `/server/logs`
- Design so Filebeat can later ship these JSON files to Elasticsearch

### 4.6 UI / UX
- Modern dark-blue color theme (primary: deep blue / indigo family)
- Dark mode as default (or strong dark-blue aesthetic)
- Loading states, skeleton loaders, and proper error handling
- Responsive (desktop-first, usable on tablet)
- Clean empty states and confirmation dialogs

---

## 5. Data Model

### Company (MongoDB)

```ts
{
  _id: ObjectId,
  name: string,             // required, unique
  createdAt: Date,
  updatedAt: Date
}
```

### ServiceType (MongoDB)

```ts
{
  _id: ObjectId,
  companyId: ObjectId,      // required, references Company
  name: string,             // required, unique together with companyId
  expectedFee: number,      // required, >= 0
  createdAt: Date,
  updatedAt: Date
}
```

### Session (MongoDB)

```ts
{
  _id: ObjectId,
  startTime: Date,          // required
  endTime: Date,            // required
  companyId: ObjectId,      // required
  serviceTypeId: ObjectId,  // required, must belong to companyId
  companyName: string,      // required snapshot
  serviceType: string,      // required snapshot
  expectedFee: number,      // required snapshot, >= 0, not client-editable
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

No userId needed (single-user application). Dashboard totals use the snapshotted `expectedFee` and group by the snapshotted `companyName`.

---

## 6. API Design

Base URL: `/api`

| Method | Endpoint                  | Description                     | Auth |
|--------|---------------------------|---------------------------------|------|
| POST   | /auth/login               | Login, returns JWT              | No   |
| GET    | /companies                | List companies and their service types | Yes |
| POST   | /companies                | Create a company                | Yes  |
| PUT    | /companies/:id            | Rename a company                | Yes  |
| DELETE | /companies/:id            | Delete a company and its service types when no session uses it | Yes |
| POST   | /companies/:id/service-types | Add a service type and fee for that company | Yes |
| PUT    | /companies/:id/service-types/:serviceTypeId | Rename a service type or change its fee | Yes |
| DELETE | /companies/:id/service-types/:serviceTypeId | Delete a service type when no session uses it | Yes |
| GET    | /sessions                 | List sessions (query: from, to) | Yes  |
| POST   | /sessions                 | Create session from a company and service type | Yes  |
| GET    | /sessions/:id             | Get one session                 | Yes  |
| PUT    | /sessions/:id             | Update session                  | Yes  |
| DELETE | /sessions/:id             | Delete session                  | Yes  |
| GET    | /dashboard/summary        | Monthly summary + breakdown     | Yes  |

Query params for `/sessions`:
- `from` / `to` (ISO date strings) — for calendar month range

`/dashboard/summary?year=2026&month=11`

---

## 7. Docker & Local Setup

### docker-compose.yml should include:
- `mongodb` service (with volume for data persistence)
- `server` service (builds from `/server`)
- `client` service (builds from `/client`, serves via nginx or Vite preview)
- Shared network
- Volume for server logs (`./server/logs`)

### SETUP.md must contain:
1. Prerequisites (Docker, Docker Compose, Node 20+ if running without Docker)
2. How to copy `.env.example` → `.env` and set credentials
3. One-command start: `docker compose up --build`
4. How to access the app (ports)
5. How to seed demo data (optional script)
6. How to view JSON logs
7. Common troubleshooting

---

## 8. README.md Requirements

The root `README.md` must include:

1. Project introduction
2. Screenshots / GIFs placeholder section
3. Quick start (point to SETUP.md)
4. Architecture overview (simple diagram in Mermaid or ASCII)
5. AI-assisted workflow section (to be filled by the candidate later)
6. **Cloud Deployment Considerations** (important for interview):
   - Helm chart structure suggestion
   - Horizontal Pod Autoscaler (HPA) recommendations
   - Active-Active / multi-AZ thoughts
   - PersistentVolumeClaim for log files + log rotation strategy
   - MongoDB considerations (managed service vs self-hosted)
   - Secrets management (Kubernetes Secrets / External Secrets)
   - Observability (Filebeat → Elasticsearch → Kibana, or modern alternatives)

---

## 9. Implementation Guidelines for Cursor

1. **Start with backend foundation**:
   - Project scaffolding (TypeScript + Express)
   - Logger utility
   - MongoDB connection + Session model
   - Auth routes + JWT middleware
   - Session CRUD + Dashboard endpoints
   - Seed script with realistic demo data

2. **Then frontend**:
   - Vite + React + TypeScript + Tailwind + shadcn/ui setup
   - Auth flow (login page + protected routes)
   - Calendar page (react-big-calendar)
   - Dashboard page with month/year selector
   - Shared layout + dark-blue theme

3. **Finally Docker**:
   - Dockerfiles for client & server
   - docker-compose.yml
   - SETUP.md and polished README.md

4. **Quality bar**:
   - Proper TypeScript types (no `any` unless justified)
   - Input validation (zod recommended on backend)
   - Consistent error responses
   - Loading & error UI states
   - Clean component structure
   - Meaningful commit messages

5. **Do not over-engineer**:
   - No multi-tenancy
   - No real payment integration
   - No complex RBAC
   - Keep the feature set exactly as specified

---

## 10. Acceptance Criteria (Definition of Done)

- [ ] User can log in with credentials from `.env`
- [ ] Unauthenticated users are redirected to login
- [ ] Calendar shows month view, defaults near today
- [ ] User can create, rename, and delete companies, and can add, edit, and delete service types and fees under a company
- [ ] The same service type name can exist under two companies with different fees
- [ ] A company or service type that is still used by a session cannot be deleted
- [ ] User can create / edit / delete sessions by choosing a company and one of its service types
- [ ] The session fee is copied from that pair, is not typed on the session, and stays unchanged when the catalog fee later changes
- [ ] Multiple sessions per day work correctly
- [ ] Dashboard allows selecting any month/year
- [ ] Dashboard shows total earnings, session count, average fee, top client
- [ ] Dashboard shows company breakdown with session details
- [ ] All API routes (except login) require valid JWT
- [ ] Structured JSON logs are written (console + file)
- [ ] `docker compose up --build` starts the full stack
- [ ] SETUP.md and README.md are complete and professional
- [ ] Dark-blue modern theme is applied consistently
- [ ] Basic loading states and error handling present

---

## 11. Suggested Color Palette (Dark Blue Theme)

```css
/* Primary */
--primary: 221 83% 53%;          /* Strong blue */
--primary-foreground: 210 40% 98%;

/* Backgrounds */
--background: 222 47% 11%;       /* Deep navy */
--card: 217 33% 17%;
--muted: 217 33% 17%;

/* Accents */
--accent: 217 91% 60%;
--border: 217 33% 24%;
```

Use shadcn/ui theming system to apply this consistently.

---

## 12. Next Steps for Cursor

1. Create the monorepo structure
2. Initialize `/server` with Express + TypeScript + Pino logger
3. Implement auth + Session model + APIs
4. Initialize `/client` with Vite + React + Tailwind + shadcn/ui
5. Build Login → Calendar → Dashboard flows
6. Add Docker support
7. Write SETUP.md and README.md
8. Add a small seed script with demo sessions

Work incrementally. After each major piece, verify it works before moving on.

---

**End of Specification**

This document should be placed at the root of the repository as `PROJECT_SPEC.md` (or `docs/PROJECT_SPEC.md`). Cursor should treat it as the authoritative requirements document.