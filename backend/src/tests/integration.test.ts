import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// 1. Prepare Test Environment
const testDbPath = path.resolve('prisma/test.db');
process.env.PORT = '5999';
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.JWT_SECRET = 'super_secret_integration_test_jwt_key_999';
process.env.NODE_ENV = 'test';

// Reset database schema and prepare SQLite tables
console.log('Setting up test database...');
execSync('npx prisma db push --accept-data-loss --force-reset', { stdio: 'inherit' });

// 2. Start application server
console.log('Starting test server...');
await import('../index.js'); // Starts the server listening on Port 5999

const BASE_URL = 'http://localhost:5999/api';

interface TestSignupResponse {
  success: boolean;
  message?: string;
}

interface TestFormResponse {
  success: boolean;
  message?: string;
  data: {
    id: string;
    title: string;
    description?: string | null;
    slug: string;
    isActive?: boolean;
    categories?: string[];
    publicUrl?: string;
  };
}

interface TestPublicFormResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    isActive: boolean;
    categories: string[];
  };
}

interface TestFeedbackListResponse {
  success: boolean;
  data: Array<{
    id: string;
    formId: string;
    category: string;
    comment: string;
    email: string | null;
    rating: number | null;
    status: string;
  }>;
}

interface TestAnalyticsResponse {
  success: boolean;
  data: {
    totalCount: number;
    averageRating: number;
    categoryDistribution: Record<string, number>;
  };
}

// Helper to parse Set-Cookie header
function getCookieHeader(responseHeaders: Headers): string {
  const setCookie = responseHeaders.get('set-cookie');
  if (!setCookie) return '';
  // Extract token=... up to the first semicolon
  const match = setCookie.match(/token=[^;]+/);
  return match ? match[0] : '';
}

test('Acowale CRM - Phase 2 E2E Integration Suite', async (t) => {
  let userACookie = '';
  let userBCookie = '';
  let formAId = '';
  let formASlug = '';

  await t.test('Auth: Signup & Login Happy Paths + Failures', async () => {
    // Signup User A
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usera@acowale.com',
        password: 'password123',
        businessName: 'Business A'
      })
    });
    assert.strictEqual(signupRes.status, 201);
    const signupData = (await signupRes.json()) as TestSignupResponse;
    assert.strictEqual(signupData.success, true);
    userACookie = getCookieHeader(signupRes.headers);
    assert.match(userACookie, /token=/);

    // Duplicate Signup failure
    const dupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usera@acowale.com',
        password: 'differentpassword',
        businessName: 'Business A'
      })
    });
    assert.strictEqual(dupRes.status, 400);

    // Login with wrong password
    const wrongLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usera@acowale.com',
        password: 'wrongpassword'
      })
    });
    assert.strictEqual(wrongLoginRes.status, 401);

    // Login success
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usera@acowale.com',
        password: 'password123'
      })
    });
    assert.strictEqual(loginRes.status, 200);
    userACookie = getCookieHeader(loginRes.headers);

    // Signup User B
    const signupBRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'userb@acowale.com',
        password: 'password123',
        businessName: 'Business B'
      })
    });
    assert.strictEqual(signupBRes.status, 201);
    userBCookie = getCookieHeader(signupBRes.headers);
  });

  await t.test('Form Creation & Ownership Scoping', async () => {
    // User A creates Form A
    const createRes = await fetch(`${BASE_URL}/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        title: 'Form A Survey',
        description: 'Customer feedback for Form A',
        categories: ['Bugs', 'Features', 'Pricing']
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createData = (await createRes.json()) as TestFormResponse;
    assert.strictEqual(createData.success, true);
    assert.strictEqual(createData.data.publicUrl, `/f/${createData.data.slug}`);
    
    formAId = createData.data.id;
    formASlug = createData.data.slug;

    // User B attempts to access User A's Form A -> returns 404 (scoping / no leakage)
    const getResB = await fetch(`${BASE_URL}/forms/${formAId}`, {
      headers: { 'Cookie': userBCookie }
    });
    assert.strictEqual(getResB.status, 404);

    // User B attempts to PATCH User A's Form A -> returns 404
    const patchResB = await fetch(`${BASE_URL}/forms/${formAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userBCookie
      },
      body: JSON.stringify({ title: 'Hacked Title' })
    });
    assert.strictEqual(patchResB.status, 404);

    // User A successfully updates Form A
    const patchResA = await fetch(`${BASE_URL}/forms/${formAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        description: 'Updated feedback description',
        categories: ['Bugs', 'Features', 'Billing', 'Docs'] // updated categories
      })
    });
    assert.strictEqual(patchResA.status, 200);

    // User A gets Form A details successfully
    const getResA = await fetch(`${BASE_URL}/forms/${formAId}`, {
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(getResA.status, 200);
    const getAData = (await getResA.json()) as TestFormResponse;
    assert.strictEqual(getAData.data.description, 'Updated feedback description');
    assert.deepStrictEqual([...(getAData.data.categories || [])].sort(), ['Bugs', 'Features', 'Billing', 'Docs'].sort());
  });

  await t.test('Public Submissions & Validation Scenarios', async () => {
    // 1. Fetch Form details publicly by slug
    const pubFetchRes = await fetch(`${BASE_URL}/public/forms/${formASlug}`);
    assert.strictEqual(pubFetchRes.status, 200);
    const pubFetchData = (await pubFetchRes.json()) as TestPublicFormResponse;
    assert.strictEqual(pubFetchData.data.title, 'Form A Survey');
    assert.deepStrictEqual([...pubFetchData.data.categories].sort(), ['Bugs', 'Features', 'Billing', 'Docs'].sort());

    // 2. Submit feedback with an invalid category -> returns 400
    const failFeedback = await fetch(`${BASE_URL}/public/forms/${formASlug}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'NonExistentCategory',
        comment: 'This is a test comment from user.'
      })
    });
    assert.strictEqual(failFeedback.status, 400);

    // 3. Submit feedback with a valid category -> returns 201
    const successFeedback = await fetch(`${BASE_URL}/public/forms/${formASlug}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Bugs',
        comment: 'There is a loading lag on the homepage.',
        email: 'tester@acowale.com',
        rating: 4
      })
    });
    assert.strictEqual(successFeedback.status, 201);
  });

  await t.test('Feedback Queries & Analytics', async () => {
    // Query feedback for Form A
    const feedbackQuery = await fetch(`${BASE_URL}/forms/${formAId}/feedback?limit=5`, {
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(feedbackQuery.status, 200);
    const fData = (await feedbackQuery.json()) as TestFeedbackListResponse;
    assert.strictEqual(fData.data.length, 1);
    assert.strictEqual(fData.data[0].category, 'Bugs');

    // Get Form A Analytics
    const analyticsRes = await fetch(`${BASE_URL}/forms/${formAId}/analytics`, {
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(analyticsRes.status, 200);
    const aData = (await analyticsRes.json()) as TestAnalyticsResponse;
    assert.strictEqual(aData.data.totalCount, 1);
    assert.strictEqual(aData.data.averageRating, 4);
    assert.strictEqual(aData.data.categoryDistribution.Bugs, 1);
  });

  await t.test('Soft Deletion Flow', async () => {
    // User A deletes Form A
    const delRes = await fetch(`${BASE_URL}/forms/${formAId}`, {
      method: 'DELETE',
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(delRes.status, 200);

    // Form A detail check: is isActive false?
    const checkRes = await fetch(`${BASE_URL}/forms/${formAId}`, {
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(checkRes.status, 200);
    const checkData = (await checkRes.json()) as TestFormResponse;
    assert.strictEqual(checkData.data.isActive, false);

    // Public fetch returns 404 for soft-deleted/inactive forms
    const pubFetchInactive = await fetch(`${BASE_URL}/public/forms/${formASlug}`);
    assert.strictEqual(pubFetchInactive.status, 404);

    // Public submission fails for soft-deleted/inactive forms
    const submitInactive = await fetch(`${BASE_URL}/public/forms/${formASlug}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Bugs',
        comment: 'Should fail since form is soft-deleted.'
      })
    });
    assert.strictEqual(submitInactive.status, 404);
  });

  await t.test('Clean up database file', async () => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      const testJournal = `${testDbPath}-journal`;
      if (fs.existsSync(testJournal)) {
        fs.unlinkSync(testJournal);
      }
      console.log('Test database cleaned up successfully.');
    } catch (e) {
      console.warn('Failed to clean up test database file:', e);
    } finally {
      console.log('Exiting test process.');
      process.exit(0);
    }
  });
});
