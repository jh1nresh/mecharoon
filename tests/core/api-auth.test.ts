import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorize,
  authorizeDemo,
  jsonResult,
  readJsonObject,
  requireIdempotencyKey,
} from '../../src/app/api/v0/_lib/http';
import {DomainError} from '../../src/server/domain/errors';

const demoEnvironment = {
  MECHAROON_DEMO_MODE: process.env.MECHAROON_DEMO_MODE,
  MECHAROON_BUYER_ID: process.env.MECHAROON_BUYER_ID,
  MECHAROON_BUYER_TOKEN: process.env.MECHAROON_BUYER_TOKEN,
  MECHAROON_SELLER_ID: process.env.MECHAROON_SELLER_ID,
  MECHAROON_SELLER_TOKEN: process.env.MECHAROON_SELLER_TOKEN,
  MECHAROON_EVALUATOR_TOKEN: process.env.MECHAROON_EVALUATOR_TOKEN,
  MECHAROON_OPERATOR_TOKEN: process.env.MECHAROON_OPERATOR_TOKEN,
  MECHAROON_DEMO_TOKEN: process.env.MECHAROON_DEMO_TOKEN,
};

function useLocalCredentials() {
  process.env.MECHAROON_DEMO_MODE = 'true';
  process.env.MECHAROON_BUYER_ID = 'buyer_test';
  process.env.MECHAROON_BUYER_TOKEN = 'buyer-token';
  process.env.MECHAROON_SELLER_ID = 'seller_test';
  process.env.MECHAROON_SELLER_TOKEN = 'seller-token';
  process.env.MECHAROON_EVALUATOR_TOKEN = 'evaluator-token';
  process.env.MECHAROON_OPERATOR_TOKEN = 'operator-token';
  process.env.MECHAROON_DEMO_TOKEN = 'demo-token';
}

test.after(() => {
  for (const [key, value] of Object.entries(demoEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test('scoped tokens cannot cross buyer, seller, evaluator, and operator roles', () => {
  useLocalCredentials();

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
  useLocalCredentials();

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
  useLocalCredentials();
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

  useLocalCredentials();
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
  useLocalCredentials();

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
