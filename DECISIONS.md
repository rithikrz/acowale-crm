# Technical Decisions & Retrospective

This document answers the core retrospective questions regarding the implementation, tooling, architecture, and constraints of **Acowale CRM**.

---

### 1. Why did you choose this technology stack?
* **Backend**: Node.js and Express in TypeScript. It is lightweight, has a massive library ecosystem, and enables rapid iteration.
* **Frontend**: React (using Vite). Vite provides near-instant Hot Module Replacement (HMR) and fast builds. Combined with pure CSS, we gained complete layout control without loading heavy framework overhead.
* **Typing**: TypeScript across the whole monorepo, sharing API requests and response interfaces without duplication, preventing compile-time integration mistakes.

---

### 2. Why did you choose this database?
* **PostgreSQL + Prisma ORM**: Relational models are perfect for this structure (`User` owns `Form` owns `Feedback`). Using document-based storage (like MongoDB) would require manual application-level join logic and lack referential integrity.
* Prisma gives us a highly readable, self-documenting schema format, automatic TypeScript interface synchronization, and robust query aggregation (e.g. counting feedbacks per form transactionally).

---

### 3. Why did you structure your application this way?
* **Entity Model (User ➔ Form ➔ Feedback)**: Represents the hierarchy of business ownership. Every feedback item is strictly scoped under a form, which belongs to exactly one tenant (User). Scoping database queries by `userId` (through form joins) guarantees that businesses can never access other accounts' records.
* **Monorepo Structure**: Keeps client and server side code in a single repository. Shared interfaces (`backend/src/types.ts`) are imported directly by the frontend, eliminating manual contract maintenance.

---

### 4. What trade-offs did you make due to time constraints?
* **Custom SVG Charts**: Rather than importing heavy charting libraries (like Recharts or Chart.js) and fighting styling configurations, we built lightweight, responsive SVG donut and line chart components directly inside `Analytics.tsx`.
* **Cookie-based Session Lifetime**: Replaced sliding session refresh tokens with simple 7-day JWT expiration stored in `httpOnly` secure cookies.

---

### 5. What would you improve if you had one more week?
* **WebSockets Support**: Add real-time feedback updates to the dashboard via Socket.io so new customer submissions pop up on the analytics dashboard instantly without manual refreshes.
* **Form Builder Enhancements**: Add support for richer question types (checkboxes, radio groups, multi-line texts) rather than a single text comment textarea.
* **Password Reset & Verification**: Add real email sending, double-opt-in signups, and password reset flows using SendGrid or Resend.

---

### 6. What was the most difficult technical challenge you faced?
* **Securing Multi-Tenant Scoping**: Enforcing scoping at the database query layer rather than the UI layer. An early challenge was preventing users from querying feedback records of other users by directly calling `/api/forms/:id/feedback` with a known ID. The solution was joining the `Form` query against `req.user.id` on *every* request and throwing a standardized `404 Not Found` (instead of a leaky `403`) to obscure existences.

---

### 7. Which AI tools did you use?
* We used **Antigravity**, a Google DeepMind agentic pair programmer.

---

### 8. Share one instance where AI helped you.
* Building the dynamic SVG path generator for the 30-day Trend line chart. The AI automatically calculated the cubic bezier point coordinates, Y-axis limits, and bottom gradient fill paths mathematically based on a dynamic input array.

---

### 9. Share one instance where you disagreed with AI and why.
* The AI initially recommended using `localStorage` to save JWT access tokens because it is simpler to manage in React SPAs. We rejected this suggestion due to the threat of Cross-Site Scripting (XSS) and chose to store tokens in `httpOnly` secure cookies.

---

### 10. What would break first if this application suddenly had 100,000 users?
* **Slug Collisions**: Slugs are generated using the form title + a short 5-character alphanumeric random suffix. With 100,000 users and millions of forms, the birthday paradox makes slug collisions probable. We would change the suffix to a longer UUID chunk or implement retry insertion loops on collision.
* **Unindexed Queries**: Querying feedback submissions using filtering and pagination would crawl if table size reaches millions. We need indexes on `Feedback(formId, createdAt)` and `Form(slug)`.
* **Public Route Abuse**: Rate limits are set to 15 submissions per 15 minutes per IP. Under distributed attacks, this is bypassable. We would need Cloudflare Web Application Firewall (WAF) rules or CAPTCHA validation.

---

### 11. What is one thing in this assignment you would improve, change, or challenge?
* We chose to extend the brief from a single-user form administrator panel into a **secure multi-tenant workspace**. Implementing proper cookie authorization, tenant routing boundaries, and ownership checks cost us significant extra time but resulted in a real-world, secure SaaS product.
