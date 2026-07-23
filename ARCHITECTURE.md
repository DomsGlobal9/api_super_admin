# Master Architecture Document: API Super Admin Platform

## 1. Executive Summary
The **Scaleezy Super Admin Platform** is a centralized, production-grade API Gateway and Identity/Access Management system. It acts as the single secure entry point for all client requests, routing them to downstream backend microservices (e.g., TryOn2Buy). 

This platform is custom-built on **Next.js 15 (App Router)** and deployed natively on **Render** (Node.js Container), ensuring long-running processes (like 90-second AI generation tasks) are natively supported without strict serverless timeout limits.

---

## 2. Technology Stack
*   **Framework:** Next.js (App Router, TypeScript, Turbopack)
*   **Deployment:** Render (Node.js runtime)
*   **Database:** PostgreSQL (Supabase Connection Pooler)
*   **ORM:** Prisma (with PostgreSQL native driver)
*   **Caching & Rate Limiting:** Upstash Redis KV
*   **Frontend UI:** React, Tailwind CSS, Shadcn UI
*   **Observability:** Built-in dynamic Auto-Polling Engine for real-time dashboard metrics.

---

## 3. Project Folder Architecture
The project structure is organized as a unified full-stack application:

```text
d:\villy\api-super-admin\
├── src/
│   ├── app/
│   │   ├── api/                   # API Routes
│   │   │   ├── gateway/           # Intercepts all client API requests
│   │   │   │   └── [microserviceSlug]/[[...path]]/route.ts
│   │   │   └── admin/             # Internal APIs for the Dashboard (e.g., /usage, /logs)
│   │   ├── (dashboard)/           # Super Admin Frontend UI
│   │   │   ├── clients/           # Client overview, usage, and logs
│   │   │   └── page.tsx           # Real-time Auto-Polling dashboards
│   │   └── layout.tsx
│   ├── components/                # Reusable UI components
│   ├── lib/
│   │   ├── gateway/proxy.ts       # Core reverse-proxy engine (CORS, timeouts)
│   │   ├── auth/api-key.ts        # Redis-backed API Key validation
│   │   └── prisma.ts              # Database connection
├── prisma/
│   └── schema.prisma              # Database schema definitions
└── .env                           # Environment variables
```

---

## 4. Core Modules

### 4.1 API Gateway Proxy Engine
The single entry point for all external client requests.
*   **Authentication:** Validates API Keys against Redis KV with fallback to PostgreSQL.
*   **Security (CORS):** Fully handles `OPTIONS` preflight requests, dynamically issuing `Access-Control-Allow-Origin` headers to whitelisted client domains (e.g., Shopify storefronts).
*   **Timeout Management:** Dynamically pulls `timeoutMs` (e.g., 90 seconds) from the database to ensure long-running AI requests aren't prematurely terminated by the Gateway.
*   **Routing:** Seamlessly proxies requests (and query parameters) to the downstream microservice (e.g., `https://api.your-backend.com`).

### 4.2 Super Admin Dashboard
The internal control panel with a **Real-Time Auto-Polling Engine**.
*   **Client Management:** Manage client identities and their active API keys.
*   **Real-Time Usage:** The dashboard continuously polls the database every 3 seconds to update total requests, success rates, and average latency on-the-fly.
*   **Dynamic Filtering:** SQL aggregations dynamically filter logs and metrics based on Time (Last 7 Days), API Key, Endpoint, or HTTP Status.
*   **Audit Logging:** Tracks every Gateway request through its lifecycle (`STARTED`, `COMPLETED`, `FAILED`, `CANCELLED`).

---

## 5. Database Design (Prisma Schema)

Core models required for the platform:

*   **`Client`**: Represents a B2B customer (id, name, status).
*   **`ApiKey`**: Bound to a Client (id, keyHash, status, requestCount).
*   **`Microservice`**: A registered downstream backend (e.g., "TryOn2Buy").
*   **`MicroserviceEnvironment`**: The actual target URLs and timeout configurations (id, environment, targetUrl, timeoutMs).
*   **`RequestLog`**: The system of record for observability (id, apiKeyId, statusCode, totalLatencyMs, endpoint).

---

## 6. Request Processing Flow (The Lifecycle)

1. **Client Request:** A client website (e.g., Shopify) calls `POST https://your-gateway-url.com/api/gateway/[microservice-slug]/[endpoint]`.
2. **Preflight (CORS):** The browser sends an `OPTIONS` request. The Gateway responds with `204 No Content` and full CORS headers.
3. **Gateway Interception:** The `POST` request hits `src/app/api/gateway/[microserviceSlug]/[[...path]]/route.ts`.
4. **Validation & Initial Log:** 
   * Reads API Key from headers.
   * Validates key via Upstash Redis.
   * Creates a `RequestLog` in PostgreSQL with status `STARTED`.
5. **Proxy / Route:** 
   * Injects an internal `x-api-key` for the downstream service.
   * Uses `AbortController` bound to the database's `timeoutMs` (e.g., 90s).
   * Forwards the request to the TryOn backend.
6. **Finalize Log:** Upon downstream response (or timeout), updates the PostgreSQL `RequestLog` with the final status code, latency, and success/failure state.
7. **Response:** Streams the unmodified payload (e.g., Base64 images) back to the client.

---

## 7. Non-Functional Requirements

*   **Long-Running Tasks:** Solved by migrating from Vercel Serverless (strict 15s/60s timeouts) to Render's Node.js container environment.
*   **Real-Time Observability:** Solved via lightweight React `useEffect` polling and highly optimized Prisma raw SQL aggregations.
*   **Zero UI Flicker:** Solved by decoupling loading states from the background auto-polling engine.
