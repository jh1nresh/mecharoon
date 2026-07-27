import type {Metadata} from 'next';

import DemoConsole from './demo-console';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verified settlement MVP',
  description:
    'Run Mecharoon’s deterministic PostgreSQL-backed verified settlement proof.',
};

export default function DemoPage() {
  const enabled =
    process.env.MECHAROON_DEMO_MODE === 'true' &&
    process.env.NODE_ENV !== 'production';

  return <DemoConsole enabled={enabled} />;
}
