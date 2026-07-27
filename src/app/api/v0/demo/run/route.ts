import {getPool} from '@/server/db/pool';
import {DomainError} from '@/server/domain/errors';
import {runGoldenDemo} from '@/server/demo';

import {
  authorizeDemo,
  isLocalDemoEnabled,
  jsonResult,
  route,
} from '../../_lib/http';

export const runtime = 'nodejs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function requestHost(request: Request): URL | null {
  const host = request.headers.get('host');
  if (!host) {
    return null;
  }
  try {
    return new URL(`http://${host}`);
  } catch {
    return null;
  }
}

function isSameOrigin(origin: string | null, host: URL): boolean {
  if (!origin) {
    return true;
  }
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.protocol === 'http:' && parsedOrigin.host === host.host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  return route(async () => {
    if (!isLocalDemoEnabled()) {
      throw new DomainError(
        404,
        'LOCAL_DEMO_DISABLED',
        'The deterministic demo is available only in non-production demo mode.',
      );
    }
    authorizeDemo(request);

    const url = new URL(request.url);
    const host = requestHost(request);
    const origin = request.headers.get('origin');
    if (
      !LOCAL_HOSTS.has(url.hostname) ||
      !host ||
      !LOCAL_HOSTS.has(host.hostname) ||
      !isSameOrigin(origin, host) ||
      request.headers.get('x-mecharoon-demo') !== 'run'
    ) {
      throw new DomainError(
        403,
        'LOCAL_DEMO_REQUEST_REQUIRED',
        'The demo runner accepts only explicit same-origin localhost requests.',
      );
    }

    return jsonResult(await runGoldenDemo(getPool()), 201);
  });
}
