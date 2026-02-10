import { test, expect } from '@playwright/test';

test.describe('Admin route auth checks', () => {
  test.skip('Admin can update user whitelist status', async ({ request }) => {
    // TODO: authenticate as admin, PUT /api/admin/whitelist-user/:id
    // Expect 200 with success message
  });

  test.skip('Admin can update artist bio', async ({ request }) => {
    // TODO: authenticate as admin, PUT /api/artistBio/:id
    // Expect 200 with success message
  });

  test.skip('Regular user gets 403 on admin operations', async ({ request }) => {
    // TODO: authenticate as regular user, PUT /api/admin/whitelist-user/:id
    // Expect 403 Forbidden
  });

  test.skip('Unauthenticated request gets 401', async ({ request }) => {
    // TODO: no auth headers, PUT /api/admin/whitelist-user/:id
    // Expect 401 Not authenticated
  });
});
