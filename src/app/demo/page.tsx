import type {Metadata} from 'next';

import DemoConsole from './demo-console';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verified settlement walkthrough',
  description:
    'Run or step through Mecharoon’s fixed settlement-control workflow with simulated settlement and no real funds.',
};

export default function DemoPage() {
  const mode =
    process.env.MECHAROON_HOSTED_SANDBOX_MODE === 'true'
      ? 'hosted'
      : process.env.MECHAROON_DEMO_MODE === 'true' &&
          process.env.NODE_ENV !== 'production'
        ? 'local'
        : 'walkthrough';

  return <DemoConsole mode={mode} />;
}
