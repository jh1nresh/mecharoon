'use client';

import Image from 'next/image';
import {motion, useReducedMotion} from 'motion/react';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {
  HOSTED_WALKTHROUGH_STEPS,
  type WalkthroughStep,
} from './demo/walkthrough';

const AUTOPLAY_DELAY_MS = 500;
const STEP_DURATION_MS = 1350;
const LOOP_DWELL_MS = 2600;
const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

const stepPresentation: Record<
  string,
  {title: string; shortLabel: string}
> = {
  DELEGATE: {
    title: 'Bound the delegated authority.',
    shortLabel: 'Delegate',
  },
  REPUTATION_GATE: {
    title: 'Reject work above the current limit.',
    shortLabel: 'Gate',
  },
  RESERVE: {
    title: 'Reserve the job budget atomically.',
    shortLabel: 'Reserve',
  },
  EVALUATE: {
    title: 'Keep the budget open when work needs revision.',
    shortLabel: 'Evaluate',
  },
  INSTRUCT: {
    title: 'Authorize settlement only after a pass.',
    shortLabel: 'Authorize',
  },
  QUARANTINE: {
    title: 'Quarantine an uncertain settlement result.',
    shortLabel: 'Hold',
  },
  RECONCILE: {
    title: 'Close the job with observed finality.',
    shortLabel: 'Reconcile',
  },
  COMPOUND: {
    title: 'Let the receipt govern the next job.',
    shortLabel: 'Next limit',
  },
};

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

function getStatusTone(step: WalkthroughStep) {
  if (['authorized', 'pass', 'confirmed'].includes(step.status)) {
    return 'is-positive';
  }

  if (['denied', 'revise'].includes(step.status)) {
    return 'is-caution';
  }

  if (step.status === 'unknown') {
    return 'is-unknown';
  }

  return '';
}

type ControlLoopProps = {
  currentStepIndex: number;
  isRunning: boolean;
  reduceMotion: boolean;
  motionEnabled: boolean;
  onSelectStep: (index: number) => void;
  onToggle: () => void;
};

function ControlLoop({
  currentStepIndex,
  isRunning,
  reduceMotion,
  motionEnabled,
  onSelectStep,
  onToggle,
}: ControlLoopProps) {
  const step = HOSTED_WALKTHROUGH_STEPS[currentStepIndex];
  const presentation = stepPresentation[step.code];
  const progress =
    currentStepIndex / (HOSTED_WALKTHROUGH_STEPS.length - 1);
  const reservationActive = step.reserved !== '$0';

  return (
    <div
      className="control-card"
      aria-label="Illustrative Mecharoon control loop"
    >
      <div className="control-card-topline">
        <span className="control-card-label">
          <BrandMark variant="reverse" micro />
          Live control loop
        </span>
        <span className="illustrative-label">Illustrative · no funds</span>
      </div>

      <div className="work-order-heading">
        <div>
          <span>Work order</span>
          <strong>Verify pricing extraction</strong>
        </div>
        <div>
          <span>Job budget</span>
          <strong>$5.00</strong>
        </div>
      </div>

      <div className="authority-path" aria-label="Delegated authority path">
        <div>
          <span>Root</span>
          <strong>$20</strong>
        </div>
        <i aria-hidden="true" />
        <div>
          <span>Child cap</span>
          <strong>$15</strong>
        </div>
        <i aria-hidden="true" />
        <div className={reservationActive ? 'is-reserved' : ''}>
          <span>Reserved</span>
          <strong>{step.reserved}</strong>
        </div>
      </div>

      <div
        className="current-control-state"
        aria-live={isRunning ? 'off' : 'polite'}
      >
        <div className="state-meta">
          <span>
            {String(currentStepIndex + 1).padStart(2, '0')} /{' '}
            {String(HOSTED_WALKTHROUGH_STEPS.length).padStart(2, '0')}
          </span>
          <b className={getStatusTone(step)}>{step.status}</b>
        </div>
        <motion.div
          className="state-copy"
          key={step.code}
          initial={motionEnabled ? {opacity: 0.35, y: 5} : false}
          animate={{opacity: 1, y: 0}}
          transition={
            motionEnabled
              ? {duration: 0.28, ease: [0.22, 1, 0.36, 1]}
              : {duration: 0}
          }
        >
          <span>{step.code.replaceAll('_', ' ')}</span>
          <h2>{presentation.title}</h2>
          <p>{step.detail}</p>
        </motion.div>
      </div>

      <dl className="control-metrics">
        <div>
          <dt>Authority</dt>
          <dd>{step.authority}</dd>
        </div>
        <div>
          <dt>Reserved</dt>
          <dd className={reservationActive ? 'metric-reserved' : ''}>
            {step.reserved}
          </dd>
        </div>
        <div>
          <dt>Settlement</dt>
          <dd>{step.settlement}</dd>
        </div>
        <div>
          <dt>Next limit</dt>
          <dd>{step.next_limit}</dd>
        </div>
      </dl>

      <div className="loop-progress">
        <div className="loop-track" aria-hidden="true">
          <motion.span
            className="loop-progress-fill"
            animate={{scaleX: progress}}
            transition={
              motionEnabled
                ? {duration: 0.48, ease: [0.22, 1, 0.36, 1]}
                : {duration: 0}
            }
          />
        </div>
        <div className="loop-steps" aria-label="Control loop steps">
          {HOSTED_WALKTHROUGH_STEPS.map((item, index) => (
            <button
              type="button"
              className={[
                'loop-step',
                index <= currentStepIndex ? 'is-complete' : '',
                index <= currentStepIndex ? getStatusTone(item) : '',
                index === currentStepIndex ? 'is-current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectStep(index)}
              aria-label={`Inspect ${stepPresentation[item.code].shortLabel}`}
              aria-pressed={index === currentStepIndex}
              key={item.code}
            >
              <i aria-hidden="true" />
              <span>{stepPresentation[item.code].shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="control-card-footer">
        <span>
          Auto-replay {isRunning ? 'running' : 'paused'}
        </span>
        <button type="button" onClick={onToggle}>
          {reduceMotion
            ? currentStepIndex === HOSTED_WALKTHROUGH_STEPS.length - 1
              ? 'Start over'
              : 'Next step'
            : isRunning
              ? 'Pause'
              : currentStepIndex === HOSTED_WALKTHROUGH_STEPS.length - 1
                ? 'Replay'
                : 'Resume'}
        </button>
      </div>
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
  const reduceMotion = useReducedMotion();
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const prefersReducedMotion = hasHydrated && reduceMotion === true;
  const motionEnabled = hasHydrated && reduceMotion === false;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [pageIsVisible, setPageIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageIsVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false || !pageIsVisible || hasStarted) return;

    const timer = window.setTimeout(() => {
      setHasStarted(true);
      setIsRunning(true);
    }, AUTOPLAY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hasStarted, pageIsVisible, reduceMotion]);

  useEffect(() => {
    if (!isRunning || !pageIsVisible || reduceMotion !== false) return;

    const atEnd =
      currentStepIndex === HOSTED_WALKTHROUGH_STEPS.length - 1;
    const timer = window.setTimeout(
      () => {
        setCurrentStepIndex((current) =>
          current === HOSTED_WALKTHROUGH_STEPS.length - 1
            ? 0
            : current + 1,
        );
      },
      atEnd ? LOOP_DWELL_MS : STEP_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, [currentStepIndex, isRunning, pageIsVisible, reduceMotion]);

  const selectStep = (index: number) => {
    setHasStarted(true);
    setCurrentStepIndex(index);
    setIsRunning(false);
  };

  const toggleLoop = () => {
    setHasStarted(true);

    if (prefersReducedMotion) {
      setCurrentStepIndex((current) =>
        current === HOSTED_WALKTHROUGH_STEPS.length - 1
          ? 0
          : current + 1,
      );
      setIsRunning(false);
      return;
    }

    if (
      !isRunning &&
      currentStepIndex === HOSTED_WALKTHROUGH_STEPS.length - 1
    ) {
      setCurrentStepIndex(0);
    }
    setIsRunning((running) => !running);
  };

  return (
    <div id="top">
      <Header />

      <main>
        <section className="hero shell">
          <div className="hero-copy hero-enter">
            <span className="hero-kicker">
              Verified settlement for paid agent work
            </span>
            <h1>
              Verify agent work.
              <br />
              Then pay.
            </h1>
            <p className="hero-subcopy">
              Set the job, cap the budget, and define what counts as done.
              Mecharoon reserves the budget, checks the result, and approves
              payment only when the work passes.
            </p>
            <div className="hero-actions">
              <a className="button button-accent" href="#flow">
                See the control loop
              </a>
              <a className="button button-outline" href="#pilot">
                Join the pilot
              </a>
            </div>
            <div className="hero-trust" aria-label="Current product boundary">
              <span>PostgreSQL-backed sandbox</span>
              <span>Simulated settlement</span>
              <span>No real funds</span>
            </div>
          </div>

          <div className="hero-product hero-enter-delayed">
            <ControlLoop
              currentStepIndex={currentStepIndex}
              isRunning={isRunning}
              reduceMotion={prefersReducedMotion}
              motionEnabled={motionEnabled}
              onSelectStep={selectStep}
              onToggle={toggleLoop}
            />
          </div>
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
