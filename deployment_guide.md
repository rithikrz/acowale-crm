# Production Deployment Guide - Acowale CRM

This guide documents the step-by-step deployment path to host **Acowale CRM** in a fully production-ready, secure, and containerized environment.

---

## 1. Database Provisioning (PostgreSQL)

Select any serverless/managed PostgreSQL provider (e.g. Neon, Supabase, Railway, Render):

1. **Create Database**: Create a new Postgres instance.
2. **Retrieve Connection String**: Copy the external/production URI, which should look like:
   `postgresql://<user>:<password>@<host>:<port>/acowale_crm?sslmode=require`
3. **Save Credentials**: This string will be supplied as `DATABASE_URL` in the Backend environment settings.

---

## 2. Backend Deployment (Railway/Render/Fly.io)

For deploying `backend/`, we use the prepared multi-stage `backend/Dockerfile` which automatically installs dependencies, transpiles code, and runs `npx prisma db push` on startup.

### Deploying via Railway

1. **Connect Repository**: Click "New Project" in Railway and select your GitHub repository.
2. **Configure Folder**: Under service settings, set **Root Directory** to `backend` (or set the build context to the root and point the **Dockerfile Path** to `backend/Dockerfile`).
3. **Environment Variables**: Set the following production variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `JWT_SECRET` = `[Generate a secure 32+ character random string]`
   - `CORS_ORIGIN` = `https://acowale-crm.vercel.app` _(Change to your actual frontend domain)_
   - `DATABASE_URL` = `[Your production PostgreSQL connection string]`
4. **Deploy**: Railway will automatically build and launch the container. The database schema push will run automatically.

### Verify Health Check

Once deployed, verify that:

- `https://acowale-crm-api.up.railway.app/health` returns:
  ```json
  { "status": "ok", "db": "connected" }
  ```

---

## 3. Frontend Deployment (Vercel/Netlify)

The React/Vite frontend builds into static assets which can be served for free on Vercel or Netlify.

### Deploying via Vercel

1. **Add New Project**: Import the workspace repository on Vercel.
2. **Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (or `vite build`)
   - **Output Directory**: `dist`
3. **Environment Variables**: Add:
   - `VITE_API_BASE` = `https://acowale-crm-api.up.railway.app/api` _(Point to your deployed backend URL + `/api` suffix)_
4. **Deploy**: Vercel will build the frontend and serve it at a production URL (e.g., `https://acowale-crm.vercel.app`).

---

## 4. End-to-End Production Verification Checklist

Follow this checklist to verify multi-tenancy boundaries and functionalities:

### Step 1: Create Tenant A

1. Navigate to `https://acowale-crm.vercel.app/signup`.
2. Register a user with email `tenant-a@acowale.com`.
3. Create a new form: `Tenant A Survey` with categories: `Bugs`, `Features`, `Support`.
4. Copy the generated public URL (e.g. `/f/tenant-a-survey-ab12c`).

### Step 2: Submit Public Feedback

1. Open an Incognito window and navigate to the public URL: `https://acowale-crm.vercel.app/f/tenant-a-survey-ab12c`.
2. Submit feedback: `Excellent features!` under the `Features` category with a 5-star rating.

### Step 3: Verify Tenant A Dashboard

1. Go back to your logged-in session for Tenant A.
2. Open `/dashboard` and check the card's submission count (should be `1`).
3. Click "View Analytics" and verify the feedback comment `Excellent features!` and category breakdown charts.

### Step 4: Verify Scoping / Tenant B Isolation

1. Open a separate browser or log out and create Tenant B (`tenant-b@acowale.com`).
2. Verify Tenant B's dashboard is completely empty (submission count is 0, no cards).
3. Try to access Tenant A's private analytics page manually by pasting Tenant A's form ID into the URL path:
   `https://acowale-crm.vercel.app/forms/[Tenant-A-Form-ID]/analytics`
4. Confirm that the application returns a clean **404 Not Found / Form not found or access denied** state (no 403 Forbidden leaks).
5. Attempt a raw `GET` to Tenant A's backend endpoint directly:
   `https://acowale-crm-api.up.railway.app/api/forms/[Tenant-A-Form-ID]/feedback`
6. Confirm the API returns a JSON error payload with status `404`:
   ```json
   {
     "success": false,
     "error": "Form not found"
   }
   ```
