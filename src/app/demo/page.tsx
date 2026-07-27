import type {Metadata} from 'next';

import DemoConsole from './demo-console';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verified settlement walkthrough',
  description:
    'Step through Mecharoon’s verified settlement control loop with illustrative data and no real funds.',
};

export default function DemoPage() {
  const enabled =
    process.env.MECHAROON_DEMO_MODE === 'true' &&
    process.env.NODE_ENV !== 'production';

  return <DemoConsole enabled={enabled} />;
}
