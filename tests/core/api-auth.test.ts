import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorize,
  authorizeDemo,
  authorizeHostedSandbox,
  jsonResult,
  readJsonObject,
  requireIdempotencyKey,
} from '../../src/app/api/v0/_lib/http';
import {DomainError} from '../../src/server/domain/errors';

const authEnvironment = {
  MECHAROON_DEMO_MODE: process.env.MECHAROON_DEMO_MODE,
  MECHAROON_HOSTED_SANDBOX_MODE:
    process.env.MECHAROON_HOSTED_SANDBOX_MODE,
  MECHAROON_BUYER_ID: process.env.MECHAROON_BUYER_ID,
  MECHAROON_BUYER_TOKEN: process.env.MECHAROON_BUYER_TOKEN,
  MECHAROON_SELLER_ID: process.env.MECHAROON_SELLER_ID,
  MECHAROON_SELLER_TOKEN: process.env.MECHAROON_SELLER_TOKEN,
  MECHAROON_EVALUATOR_TOKEN: process.env.MECHAROON_EVALUATOR_TOKEN,
  MECHAROON_OPERATOR_TOKEN: process.env.MECHAROON_OPERATOR_TOKEN,
  MECHAROON_DEMO_TOKEN: process.env.MECHAROON_DEMO_TOKEN,
  MECHAROON_SANDBOX_PARTNER_ID:
    process.env.MECHAROON_SANDBOX_PARTNER_ID,
  MECHAROON_SANDBOX_TOKEN: process.env.MECHAROON_SANDBOX_TOKEN,
};

const hostedSandboxToken =
  'sandbox-token-0123456789abcdef0123456789abcdef';

function configureLocalCredentials() {
  process.env.MECHAROON_DEMO_MODE = 'true';
  process.env.MECHAROON_BUYER_ID = 'buyer_test';
  process.env.MECHAROON_BUYER_TOKEN = 'buyer-token';
  process.env.MECHAROON_SELLER_ID = 'seller_test';
  process.env.MECHAROON_SELLER_TOKEN = 'seller-token';
  process.env.MECHAROON_EVALUATOR_TOKEN = 'evaluator-token';
  process.env.MECHAROON_OPERATOR_TOKEN = 'operator-token';
  process.env.MECHAROON_DEMO_TOKEN = 'demo-token';
}

function configureHostedCredentials() {
  configureLocalCredentials();
  process.env.MECHAROON_HOSTED_SANDBOX_MODE = 'true';
  process.env.MECHAROON_SANDBOX_PARTNER_ID = 'design_partner_01';
  process.env.MECHAROON_SANDBOX_TOKEN = hostedSandboxToken;
}

test.after(() => {
  for (const [key, value] of Object.entries(authEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('scoped tokens cannot cross buyer, seller, evaluator, and operator roles', () => {
  configureLocalCredentials();

  const buyer = authorize(
    new Request('http://localhost', {
      headers: {authorization: 'Bearer buyer-token'},
    }),
    ['buyer'],
  );
  assert.deepEqual(buyer, {participantId: 'buyer_test', role: 'buyer'});

  const seller = authorize(
    new Request('http://localhost', {
      headers: {authorization: 'Bearer seller-token'},
    }),
    ['seller'],
  );
  assert.deepEqual(seller, {participantId: 'seller_test', role: 'seller'});

  const evaluator = authorize(
    new Request('http://localhost', {
      headers: {authorization: 'Bearer evaluator-token'},
    }),
    ['evaluator'],
  );
  assert.deepEqual(evaluator, {
    participantId: 'system_evaluator',
    role: 'evaluator',
  });

  assert.throws(
    () =>
      authorize(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer buyer-token'},
        }),
        ['operator'],
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'INSUFFICIENT_ROLE',
  );
  assert.throws(
    () =>
      authorize(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer seller-token'},
        }),
        ['evaluator'],
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'INSUFFICIENT_ROLE',
  );
});

test('missing and invalid tokens fail closed', () => {
  configureLocalCredentials();

  assert.throws(
    () => authorize(new Request('http://localhost'), ['buyer']),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'AUTHENTICATION_REQUIRED',
  );
  assert.throws(
    () =>
      authorize(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer wrong-token'},
        }),
        ['buyer'],
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'INVALID_CREDENTIALS',
  );
});

test('duplicate configured tokens fail closed instead of escalating privileges', () => {
  configureLocalCredentials();
  process.env.MECHAROON_OPERATOR_TOKEN = 'buyer-token';

  assert.throws(
    () =>
      authorize(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer buyer-token'},
        }),
        ['buyer'],
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'AUTH_CONFIGURATION_INVALID' &&
      error.httpStatus === 503,
  );

  configureLocalCredentials();
  process.env.MECHAROON_DEMO_TOKEN = 'seller-token';
  assert.throws(
    () =>
      authorizeDemo(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer seller-token'},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'AUTH_CONFIGURATION_INVALID' &&
      error.httpStatus === 503,
  );
});

test('the local demo requires its own configured token', () => {
  configureLocalCredentials();

  assert.throws(
    () => authorizeDemo(new Request('http://localhost')),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'DEMO_AUTHENTICATION_REQUIRED',
  );
  assert.throws(
    () =>
      authorizeDemo(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer wrong-token'},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'DEMO_AUTHENTICATION_REQUIRED',
  );
  assert.doesNotThrow(() =>
    authorizeDemo(
      new Request('http://localhost', {
        headers: {authorization: 'Bearer demo-token'},
      }),
    ),
  );

  delete process.env.MECHAROON_DEMO_TOKEN;
  assert.throws(
    () => authorizeDemo(new Request('http://localhost')),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'DEMO_AUTH_NOT_CONFIGURED' &&
      error.httpStatus === 503,
  );
});

test('the hosted sandbox requires an isolated invite token and partner', () => {
  configureHostedCredentials();

  assert.deepEqual(
    authorizeHostedSandbox(
      new Request('http://localhost', {
        headers: {authorization: `Bearer ${hostedSandboxToken}`},
      }),
    ),
    {partnerId: 'design_partner_01'},
  );
  assert.throws(
    () => authorizeHostedSandbox(new Request('http://localhost')),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_AUTHENTICATION_REQUIRED' &&
      error.httpStatus === 401,
  );
  assert.throws(
    () =>
      authorizeHostedSandbox(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer wrong-token'},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_AUTHENTICATION_REQUIRED' &&
      error.httpStatus === 401,
  );

  configureHostedCredentials();
  delete process.env.MECHAROON_SANDBOX_PARTNER_ID;
  assert.throws(
    () =>
      authorizeHostedSandbox(
        new Request('http://localhost', {
          headers: {authorization: `Bearer ${hostedSandboxToken}`},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_AUTH_NOT_CONFIGURED' &&
      error.httpStatus === 503,
  );

  configureHostedCredentials();
  process.env.MECHAROON_SANDBOX_PARTNER_ID = 'INVALID-PARTNER';
  assert.throws(
    () =>
      authorizeHostedSandbox(
        new Request('http://localhost', {
          headers: {authorization: `Bearer ${hostedSandboxToken}`},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_AUTH_NOT_CONFIGURED' &&
      error.httpStatus === 503,
  );

  configureHostedCredentials();
  delete process.env.MECHAROON_SANDBOX_TOKEN;
  assert.throws(
    () => authorizeHostedSandbox(new Request('http://localhost')),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_AUTH_NOT_CONFIGURED' &&
      error.httpStatus === 503,
  );

  configureHostedCredentials();
  process.env.MECHAROON_SANDBOX_TOKEN = 'too-short';
  assert.throws(
    () =>
      authorizeHostedSandbox(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer too-short'},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'SANDBOX_AUTH_NOT_CONFIGURED' &&
      error.httpStatus === 503,
  );
});

test('a hosted sandbox token duplicated across roles fails closed', () => {
  configureHostedCredentials();
  process.env.MECHAROON_SANDBOX_TOKEN = 'buyer-token';

  assert.throws(
    () =>
      authorizeHostedSandbox(
        new Request('http://localhost', {
          headers: {authorization: 'Bearer buyer-token'},
        }),
      ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'AUTH_CONFIGURATION_INVALID' &&
      error.httpStatus === 503,
  );
});

test('mutations require a bounded idempotency key and object body', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': 'request-1',
    },
    body: '{"amount_minor":"500"}',
  });
  assert.equal(requireIdempotencyKey(request), 'request-1');
  assert.deepEqual(await readJsonObject(request), {amount_minor: '500'});

  assert.throws(
    () => requireIdempotencyKey(new Request('http://localhost')),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'IDEMPOTENCY_KEY_REQUIRED',
  );

  await assert.rejects(
    readJsonObject(
      new Request('http://localhost', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: '[]',
      }),
    ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'INVALID_JSON_OBJECT',
  );

  await assert.rejects(
    readJsonObject(
      new Request('http://localhost', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({payload: 'x'.repeat(65 * 1024)}),
      }),
    ),
    (error) =>
      error instanceof DomainError &&
      error.reasonCode === 'PAYLOAD_TOO_LARGE',
  );
});

test('API responses are explicitly non-cacheable', () => {
  const response = jsonResult({status: 'ok'});
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
});
