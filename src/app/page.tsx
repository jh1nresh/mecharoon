'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  useState,
  useSyncExternalStore,
} from 'react';

const ClearingMachineScene = dynamic(
  () =>
    import('./clearing-machine-scene').then(
      (module) => module.ClearingMachineScene,
    ),
  {
    ssr: false,
    loading: () => <div className="clearing-machine-loading" aria-hidden="true" />,
  },
);

const proofFacts = [
  {
    value: '50',
    label: 'concurrent child attempts stay inside ancestor limits',
  },
  {
    value: '1',
    label: 'reservation survives 50 identical idempotency requests',
  },
  {
    value: '0',
    label: 'receipts are issued before settlement finality',
  },
];

function BrandMark({
  variant = 'color',
  micro = false,
}: {
  variant?: 'color' | 'reverse';
  micro?: boolean;
}) {
  const asset = micro
    ? `mecharoon-symbol-micro-${variant}.svg`
    : `mecharoon-symbol-${variant}.svg`;

  return (
    <Image
      className="brand-symbol"
      src={`/brand/${asset}`}
      width={24}
      height={24}
      alt=""
      aria-hidden="true"
      loading="eager"
    />
  );
}

function BrandWordmark() {
  return (
    <Image
      className="brand-wordmark"
      src="/brand/mecharoon-wordmark.svg"
      width={156}
      height={36}
      alt=""
      aria-hidden="true"
      loading="eager"
    />
  );
}

function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a className="brand" href="#top" aria-label="Mecharoon home">
          <BrandMark />
          <BrandWordmark />
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#flow">Control loop</a>
          <a href="#proof">Proof</a>
          <a href="#boundary">Boundary</a>
        </nav>

        <a className="button button-small button-dark" href="#pilot">
          Join pilot
        </a>
      </div>
    </header>
  );
}

type MoneyFlowStageProps = {
  paused: boolean;
  reducedMotion: boolean;
};

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener('change', onChange);

  return () => mediaQuery.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return true;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function MoneyFlowStage({paused, reducedMotion}: MoneyFlowStageProps) {
  return (
    <div
      className="money-flow-stage"
      role="img"
      aria-label="A five dollar work budget drops into Mecharoon, is reserved and verified, and only then does the approved FinalReceipt exit"
    >
      <ClearingMachineScene
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

function FinalReceipt() {
  return (
    <div className="final-receipt" aria-label="Illustrative FinalReceipt">
      <div className="final-receipt-header">
        <div>
          <BrandMark variant="reverse" micro />
          <span>FinalReceipt</span>
        </div>
        <span>receipt_01</span>
      </div>

      <div className="receipt-verdict">
        <span>Outcome</span>
        <strong>PASS · FINAL</strong>
      </div>

      <dl>
        <div>
          <dt>Authority path</dt>
          <dd>root / child / job</dd>
        </div>
        <div>
          <dt>Work order</dt>
          <dd>pricing-extraction-01</dd>
        </div>
        <div>
          <dt>Accepted amount</dt>
          <dd>$5.00</dd>
        </div>
        <div>
          <dt>Settlement</dt>
          <dd>simulated confirmed</dd>
        </div>
        <div>
          <dt>Previous limit</dt>
          <dd>$5.00</dd>
        </div>
        <div className="receipt-limit-row">
          <dt>Next job limit</dt>
          <dd>$10.00</dd>
        </div>
      </dl>

      <p>
        One append-only record links the authorizer, accepted work, observed
        payment state, and the agent&apos;s next limit.
      </p>
    </div>
  );
}

export default function Home() {
  const [motionPaused, setMotionPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div id="top">
      <Header />

      <main>
        <section className="hero hero-cinematic">
          <div className="hero-product hero-enter-delayed">
            <MoneyFlowStage
              paused={motionPaused}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="shell hero-foreground">
            <div className="hero-copy hero-enter">
              <span className="hero-kicker">
                Verified settlement for paid agent work
              </span>
              <h1>Verify agent work. Then pay.</h1>
              <p className="hero-subcopy">
                Set the job, cap the budget, and define what counts as done.
                Mecharoon reserves the budget, checks the result, and approves
                payment only when the work passes.
              </p>
              <div className="hero-actions">
                <a className="button button-dark" href="#flow">
                  See the control loop
                </a>
                <a className="hero-text-link" href="#pilot">
                  Join the pilot <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>

          {!reducedMotion && (
            <button
              className="motion-toggle"
              type="button"
              onClick={() => setMotionPaused((paused) => !paused)}
              aria-pressed={motionPaused}
              aria-label={
                motionPaused
                  ? 'Play money flow animation'
                  : 'Pause money flow animation'
              }
            >
              <span aria-hidden="true">{motionPaused ? '▶' : 'Ⅱ'}</span>
            </button>
          )}
        </section>

        <section className="story-section section-rule" id="flow">
          <div className="shell story-layout">
            <div className="story-heading">
              <span className="section-kicker">One closed loop</span>
              <h2>A payment rail sees money. Mecharoon sees the job.</h2>
              <p>
                The financial decision stays attached to the work from
                delegated authority through final settlement.
              </p>
            </div>

            <div className="story-sequence">
              <article>
                <span>Before work</span>
                <h3>Define exactly what the agent may do.</h3>
                <p>
                  Bind the work order to an authority path, a budget cap, an
                  idempotency key, and an acceptance rule.
                </p>
                <strong>Authority → budget → acceptance rule</strong>
              </article>
              <article>
                <span>While working</span>
                <h3>Keep exposure reserved until the result is known.</h3>
                <p>
                  A revision keeps the budget open. A failed or uncertain
                  settlement cannot silently become spendable again.
                </p>
                <strong>Reserve → evidence → PASS or REVISE</strong>
              </article>
              <article>
                <span>After work</span>
                <h3>Turn finality into the next authority decision.</h3>
                <p>
                  The FinalReceipt connects accepted work to observed payment
                  state and raises or lowers the contextual limit for the next
                  job.
                </p>
                <strong>Reconcile → receipt → next limit</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="proof-section" id="proof">
          <div className="shell proof-grid">
            <div className="proof-copy">
              <span className="section-kicker">Local failure proof</span>
              <h2>The receipt exists only after the economic truth is known.</h2>
              <p>
                The current MVP exercises the failures that a happy-path
                payment demo skips: concurrent reservation, duplicate
                requests, revision, uncertain settlement, and premature
                reputation.
              </p>

              <div className="proof-facts">
                {proofFacts.map((fact) => (
                  <div key={fact.value}>
                    <strong>{fact.value}</strong>
                    <span>{fact.label}</span>
                  </div>
                ))}
              </div>

              <a
                className="text-link"
                href="https://github.com/jh1nresh/mecharoon"
                target="_blank"
                rel="noreferrer"
              >
                Inspect the repository <span aria-hidden="true">↗</span>
              </a>
            </div>

            <FinalReceipt />
          </div>

          <div className="shell proof-boundary">
            <span>PostgreSQL-backed test path</span>
            <span>Simulated settlement adapter</span>
            <span>No customer funds held</span>
          </div>
        </section>

        <section className="boundary-section section-rule" id="boundary">
          <div className="shell boundary-heading">
            <span className="section-kicker">Rail neutral by design</span>
            <h2>Control the work offchain. Keep settlement rail-neutral.</h2>
          </div>

          <div className="shell boundary-grid">
            <article>
              <span>Mecharoon owns the decision</span>
              <h3>Authority, evidence, verdict, and reputation stay above the rail.</h3>
              <p>
                Your platform remains the system of engagement. Mecharoon
                returns deterministic next actions and a finance-readable
                receipt.
              </p>
              <ul>
                <li>Delegated and revocable limits</li>
                <li>Atomic reservation across ancestors</li>
                <li>Committed evidence and acceptance verdict</li>
                <li>FinalReceipt and contextual next limit</li>
              </ul>
            </article>

            <article>
              <span>The adapter owns movement</span>
              <h3>Only approved value is eligible to cross into a settlement rail.</h3>
              <p>
                The MVP uses a simulated adapter. The same state machine can
                later observe wallets, API credits, cards, or invoices without
                turning Mecharoon into a payment rail.
              </p>
              <div className="rail-line" aria-label="Potential settlement rails">
                <span>Wallets</span>
                <span>API credits</span>
                <span>Cards</span>
                <span>Invoices</span>
              </div>
            </article>
          </div>
        </section>

        <section className="pilot-section" id="pilot">
          <div className="shell pilot-inner">
            <div>
              <span className="section-kicker">Design partner pilot</span>
              <h2>Bring one paid agent workflow.</h2>
              <p>
                We&apos;ll map who can authorize it, what counts as done, how
                much can be reserved, and which receipt your finance team needs.
              </p>
            </div>
            <div className="pilot-actions">
              <a
                className="button button-accent"
                href="https://github.com/jh1nresh/mecharoon/issues/new?title=Mecharoon%20pilot"
                target="_blank"
                rel="noreferrer"
              >
                Request pilot access
              </a>
              <span>Single workflow · simulated funds · direct founder support</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="shell footer-inner">
          <a className="brand" href="#top" aria-label="Mecharoon home">
            <BrandMark />
            <BrandWordmark />
          </a>
          <p>The financial control infrastructure for agentic work.</p>
          <div>
            <a
              href="https://github.com/jh1nresh/mecharoon"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a href="#flow">Control loop</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
