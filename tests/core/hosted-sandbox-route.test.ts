import assert from 'node:assert/strict';
import test from 'node:test';

import {POST} from '../../src/app/api/v0/sandbox/runs/route';

const managedEnvironment = [
  'MECHAROON_HOSTED_SANDBOX_MODE',
  'MECHAROON_SANDBOX_PARTNER_ID',
  'MECHAROON_SANDBOX_TOKEN',
  'MECHAROON_BUYER_TOKEN',
  'MECHAROON_SELLER_TOKEN',
  'MECHAROON_EVALUATOR_TOKEN',
  'MECHAROON_OPERATOR_TOKEN',
  'MECHAROON_DEMO_TOKEN',
] as const;
const originalEnvironment = Object.fromEntries(
  managedEnvironment.map((key) => [key, process.env[key]]),
);

function configureHostedAuth(): void {
  process.env.MECHAROON_HOSTED_SANDBOX_MODE = 'true';
  process.env.MECHAROON_SANDBOX_PARTNER_ID = 'route_test_partner';
  process.env.MECHAROON_SANDBOX_TOKEN =
    'route-test-token-0123456789abcdef0123456789abcdef';
  for (const key of managedEnvironment.slice(3)) {
    delete process.env[key];
  }
}

test.after(() => {
  for (const key of managedEnvironment) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('hosted sandbox fails closed while the mode is disabled', async () => {
  configureHostedAuth();
  process.env.MECHAROON_HOSTED_SANDBOX_MODE = 'false';

  const response = await POST(
    new Request('http://localhost/api/v0/sandbox/runs', {method: 'POST'}),
  );
  const body = (await response.json()) as {reason_code: string};

  assert.equal(response.status, 404);
  assert.equal(body.reason_code, 'HOSTED_SANDBOX_DISABLED');
});

test('hosted sandbox rejects caller-controlled workflow fields before database access', async () => {
  configureHostedAuth();

  const response = await POST(
    new Request('http://localhost/api/v0/sandbox/runs', {
      method: 'POST',
      headers: {
        authorization:
          'Bearer route-test-token-0123456789abcdef0123456789abcdef',
        'content-type': 'application/json',
        'idempotency-key': 'route-test-input',
      },
      body: JSON.stringify({amount_minor: '1000000'}),
    }),
  );
  const body = (await response.json()) as {reason_code: string};

  assert.equal(response.status, 400);
  assert.equal(body.reason_code, 'SANDBOX_WORKFLOW_FIXED');
});

test('hosted sandbox stops reading request bodies above 64 KiB', async () => {
  configureHostedAuth();

  const response = await POST(
    new Request('http://localhost/api/v0/sandbox/runs', {
      method: 'POST',
      headers: {
        authorization:
          'Bearer route-test-token-0123456789abcdef0123456789abcdef',
        'idempotency-key': 'route-test-oversized',
      },
      body: 'x'.repeat(65 * 1024),
    }),
  );
  const body = (await response.json()) as {reason_code: string};

  assert.equal(response.status, 413);
  assert.equal(body.reason_code, 'PAYLOAD_TOO_LARGE');
});
