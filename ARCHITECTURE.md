# Master Architecture Document: API Super Admin Platform

## 1. Executive Summary
The **API Super Admin Platform** is a centralized, production-grade API Gateway and Identity/Access Management system. It acts as the single secure entry point for all client requests, routing them to backend microservices (starting with `TryOn2Buy`). 

This platform is custom-built on **Next.js** and deployed on **Vercel** using highly optimized Node.js Serverless Functions.

---

## 2. Technology Stack
*   **Framework:** Next.js (App Router, TypeScript)
*   **Deployment & Infrastructure:** Vercel (Node.js Serverless Functions)
*   **Database:** PostgreSQL (Vercel Postgres / Neon)
*   **ORM:** Prisma
*   **Caching & Rate Limiting:** Vercel KV (Upstash Redis)
*   **Frontend UI:** React, Tailwind CSS, Shadcn UI
*   **Payments & Billing:** Stripe API

---

## 3. Project Folder Architecture
Since this is a unified full-stack Next.js application, the project structure is organized as follows:

```text
d:\villy\api-super-admin\
├── src/
│   ├── app/
│   │   ├── api/                   # The API Gateway (Node.js API Routes)
│   │   │   ├── gateway/           # Intercepts all client API requests
│   │   │   └── webhooks/          # Handles async callbacks from microservices
│   │   ├── dashboard/             # Super Admin Frontend UI
│   │   │   ├── clients/
│   │   │   ├── modules/
│   │   │   └── analytics/
│   │   └── layout.tsx
│   ├── components/                # Reusable UI components (Tailwind/Shadcn)
│   ├── lib/
│   │   ├── prisma.ts              # Database connection
│   │   ├── redis.ts               # Upstash KV connection
│   │   └── stripe.ts              # Billing integration
│   └── middleware.ts              # Next.js Middleware for Dashboard Auth
├── prisma/
│   └── schema.prisma              # Database schema definitions
└── .env                           # Environment variables
```

---

## 4. Core Modules

### 4.1 API Gateway (Node.js Serverless Routing)
The single entry point for all client requests. Runs on standard Node.js Serverless functions to support full DB drivers and longer timeouts.
*   **Authentication:** Validates API Keys against Redis in <5ms.
*   **Security (CORS):** Validates the `Origin` or `Referer` against the client's whitelisted domains to prevent API key theft.
*   **Authorization:** Validates Client status, Subscription tier, and Module Access.
*   **Routing:** Forwards the validated payload to the appropriate microservice (e.g., TryOn backend).
*   **Rate Limiting:** Enforces quotas (per minute/day) using Redis sliding windows.

### 4.2 Super Admin Dashboard
The internal control panel for operations.
*   **Client Management:** Create, update, suspend clients.
*   **API Key Management:** Generate, revoke, rotate keys, and bind allowed domains.
*   **Module Management:** Register new microservices (Name, Target URL, Health Endpoint) dynamically.
*   **Access Management:** Grant/Revoke specific microservice access to clients.

*Note: The platform operates with a single unified **Super Admin** role to minimize complexity. Complex RBAC and client-facing Developer Portals are intentionally excluded from this architecture.*

### 4.3 Analytics & Request Logging
*   Every request is logged asynchronously (Client, Module, Endpoint, Status Code, Latency, IP).
*   Dashboard displays Total Requests, Success/Failure rates, and top clients.

### 4.4 Webhooks & Async Processing
*   A Webhook Dispatcher module that reliably sends POST requests to client-configured URLs when asynchronous jobs finish.

### 4.5 Billing & Subscriptions
*   Stripe integration for tracking API usage and generating automated invoices.

---

## 6. Database Design (Prisma Schema)

Core tables required for the platform:

*   **`clients`**: id, company_name, email, status, stripe_customer_id, created_at
*   **`users`**: id, email, password_hash (For internal Super Admins only)
*   **`api_keys`**: id, client_id, key_hash, allowed_domains, expires_at
*   **`modules`**: id, name, target_url, status, health_endpoint
*   **`client_modules`**: client_id, module_id (Join table for access control)
*   **`request_logs`**: id, client_id, module_id, method, latency_ms, status_code, timestamp
*   **`subscriptions`**: id, client_id, stripe_plan_id, status

---

## 7. Request Processing Flow (The Lifecycle)

1. **Client Request:** A client (e.g., Shopify widget) calls `POST api.villy.com/api/gateway/tryon`.
2. **Gateway Interception:** The Next.js API Route catches the request.
3. **Cache & Security Validation:** 
   *   Reads API Key from headers.
   *   Checks Redis KV for key validity and Rate Limits.
   *   Validates `Origin` matches allowed domains.
4. **Access Check:** Verifies the client is active and has permission for the `tryon` module.
5. **Proxy / Route:** The API Route forwards the request to the TryOn backend URL.
6. **Async Logging:** Once the response is received, the Gateway fires a background event to log the request in PostgreSQL.
7. **Response:** Returns the result to the client.

---

## 8. Non-Functional Requirements

*   **High Performance:** Achieved via Next.js highly optimized Node.js API Routes.
*   **High Availability & Auto-Scaling:** Handled natively by Vercel serverless infrastructure.
*   **Single Codebase:** Frontend and Backend coexist cleanly.
*   **Type Safety:** End-to-end TypeScript (from Prisma DB to React UI).
