# Teach Us: Deep Dives & Lessons Learned

This file documents technical concepts, architectural patterns, and solutions to interesting problems encountered during the design of **Acowale CRM**.

## 1. Secure Authentication Flow (Deep Dive)

Many web applications use local storage for JWT tokens, making them vulnerable to XSS. In this project, we implement a secure session system using httpOnly cookies:

- **How httpOnly works**: The browser blocks JavaScript access to `document.cookie` if the cookie is set with the `HttpOnly` flag.
- **CSRF Mitigations**:
  - `SameSite=Lax`: Standard security that prevents cookie transmission in cross-site requests (e.g., links from third-party websites), while allowing them during standard top-level navigation.
  - Custom Request Headers: Attaching custom headers (e.g. `X-Requested-With` or a custom CSRF header) or using CORS configurations restricted to the frontend origin.

## 2. Shared Types without Build Overhead

In standard monorepos, shared packages need a separate build step (e.g., building `shared/` using `tsup` or `tsc` before running frontend/backend).

- In our lightweight setup, the frontend references `backend` via npm workspaces directly.
- Because Vite supports importing TypeScript directly, we import TypeScript types directly from `backend/src/types.ts` without needing a compilation phase for the shared files.
- This creates an instantaneous feedback loop during development (type mismatches are caught in real-time as you type).

## 3. Database Indexing for Multi-Tenant Scoping

In a multi-tenant feedback platform:

- We frequently query forms owned by a specific user: `SELECT * FROM Form WHERE userId = ?`
- We frequently query feedback submitted to a specific form: `SELECT * FROM Feedback WHERE formId = ?`
- **Lessons**: To ensure these queries remain fast as the database grows, we define indexes on foreign keys (`userId` in Form, `formId` in Feedback). Prisma automatically indexes foreign keys in relation fields when mapped to PostgreSQL constraints.
