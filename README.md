# 🐮 Acowale CRM - Multi-Tenant Customer Feedback Platform

**Acowale CRM** is a high-performance customer feedback collection and analysis engine designed for multi-tenant business structures.
A business signs up for an account, designs feedback forms with custom categories (e.g. _Bugs_, _Billing_, _Support_), shares the generated public-facing links with their clients, and visualizes incoming feedback in real-time through an analytical dashboard.

---

## 🚀 Live Demo URLs

- **Frontend Dashboard**: `[https://acowale-crm.vercel.app](https://acowale-crm-frontend-ten.vercel.app)`
- **Backend API Base**: `[https://acowale-crm-api.up.railway.app`](https://backend-production-412af.up.railway.app/)`
- **Backend Health Check**: `[https://acowale-crm-api.up.railway.app](https://backend-production-412af.up.railway.app/)/health`

---

## 🛠️ Technical Stack

- **Monorepo Layout**: Node workspaces (`frontend/`, `backend/`)
- **Frontend**: React, TypeScript, Vite, SPA Client Routing, custom CSS Glassmorphic design system
- **Backend**: Node.js, Express, TypeScript, Zod Payload Validation, rate-limiting security middleware
- **Database / ORM**: PostgreSQL, Prisma ORM, Prisma Client
- **Authentication**: JWT stored in `httpOnly` secure cookies with bcrypt password hashing
- **Testing**: Native Node.js test runner (`node:test`) + Integration boundary assertions

---

## 📂 Project Structure

```
acowale-crm/
├── frontend/               # React + Vite Client Application
│   ├── src/
│   │   ├── components/     # RouteGuards, protected and public route filters
│   │   ├── context/        # AuthContext session context
│   │   ├── pages/          # Login, Signup, Dashboard, FormEditor, PublicForm, Analytics
│   │   └── index.css       # Design System CSS tokens & custom styles
│   └── tsconfig.json       # Frontend typescript rules
│
├── backend/                # Express Rest API Server
│   ├── src/
│   │   ├── routes/         # auth, forms, feedback, dashboard, public endpoints
│   │   ├── middleware/     # requireAuth token verification, validate schema, error handlers
│   │   ├── tests/          # E2E multi-tenancy integration tests
│   │   └── index.ts        # App bootstrapper
│   └── prisma/             # Schema definitions and database migrations
│
├── .github/workflows/      # CI/CD GitHub Actions checks
├── docker-compose.yml      # Root production docker configuration
├── README.md               # User guide & documentation
└── DECISIONS.md            # Technical choices & retrospect
```

---

## 💻 Local Development Setup

Follow these steps to run a fresh clone of the repository locally.

### 1. Prerequisites

- **Node.js**: >= 20.x
- **npm**: >= 10.x

### 2. Install Workspace Dependencies

Run from the root directory to install both frontend and backend modules:

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file inside the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Ensure the variables are set (default uses SQLite local file for quick development):

- `DATABASE_URL` = `"file:./dev.db"`
- `JWT_SECRET` = `"acowale_crm_super_secret_dev_key_rithik_ranjan"`
- `CORS_ORIGIN` = `"http://localhost:5173"`

### 4. Database Setup & Migrations

Sync the database schemas:

```bash
cd backend
npx prisma db push
cd ..
```

### 5. Running the Application

Run both servers concurrently using the root workspaces script:

```bash
# In one terminal tab: Start the backend server (runs on http://localhost:5000)
npm run dev:backend

# In another terminal tab: Start the frontend server (runs on http://localhost:5173)
npm run dev:frontend
```

---

## 🧪 Running Integration Tests

We have implemented E2E integration test suites testing authentication paths, form isolation boundaries, rate limit enforcement, and soft-deletion behavior:

```bash
npm run test --workspace=backend
```

---

## 🗺️ "How to Try It" E2E Walkthrough

Follow this step-by-step path to experience the complete platform flow:

1. **Sign Up**: Navigate to `http://localhost:5173/signup` and register a business account (e.g. _Acowale Org_).
2. **Create a Form**: On the Dashboard, click **Create New Form**. Set the Title (e.g. _Beta Feedback_), Description, and add custom categories (e.g. _UI/UX_, _Speed_, _Bugs_). Save the form.
3. **Copy Link**: Copy the generated shareable URL showing prominently in the payoff window (looks like `http://localhost:5173/f/beta-feedback-abc12`).
4. **Submit Feedback**: Open a separate **incognito** tab, paste the link, choose a category, leave a rating, write a comment, and submit.
5. **Analyze Submissions**: Return to the business owner dashboard, click **View Analytics** on your form card, and watch the interactive SVG charts and paginated table render the new customer response instantly.
