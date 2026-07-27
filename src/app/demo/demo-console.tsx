'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';

import styles from './demo.module.css';
import {
  HOSTED_WALKTHROUGH_RESULT,
  HOSTED_WALKTHROUGH_STEPS,
  type DemoResult,
} from './walkthrough';

type ErrorEnvelope = {
  reason_code?: string;
  message?: string;
};

function dollars(minor: string): string {
  return `$${(Number(minor) / 100).toFixed(2)}`;
}

function shortHash(value: string | null | undefined): string {
  if (!value) return 'Not available';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

export default function DemoConsole({enabled}: {enabled: boolean}) {
  const [result, setResult] = useState<DemoResult | null>(null);
  const [state, setState] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState('');
  const [demoToken, setDemoToken] = useState('');
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const isHostedWalkthrough = !enabled;
  const activeWalkthroughStep =
    walkthroughStep > 0
      ? HOSTED_WALKTHROUGH_STEPS[walkthroughStep - 1]
      : null;
  const displayResult =
    isHostedWalkthrough &&
    walkthroughStep === HOSTED_WALKTHROUGH_STEPS.length
      ? HOSTED_WALKTHROUGH_RESULT
      : result;

  async function runDemo() {
    setState('running');
    setError('');
    try {
      const response = await fetch('/api/v0/demo/run', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${demoToken.trim()}`,
          'content-type': 'application/json',
          'x-mecharoon-demo': 'run',
        },
      });
      const body = (await response.json()) as DemoResult | ErrorEnvelope;
      if (!response.ok) {
        const failure = body as ErrorEnvelope;
        throw new Error(
          [failure.reason_code, failure.message].filter(Boolean).join(': '),
        );
      }
      setResult(body as DemoResult);
      setState('idle');
    } catch (cause) {
      setState('error');
      setError(
        cause instanceof Error ? cause.message : 'The demo could not run.',
      );
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link className={styles.brand} href="/" aria-label="Mecharoon home">
          <Image
            src="/brand/mecharoon-symbol-color.svg"
            width={28}
            height={28}
            alt=""
            aria-hidden="true"
          />
          <Image
            className={styles.wordmark}
            src="/brand/mecharoon-wordmark.svg"
            width={128}
            height={24}
            alt="Mecharoon"
          />
        </Link>
        <Link className={styles.back} href="/">
          Back to overview
        </Link>
      </nav>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            {isHostedWalkthrough
              ? 'HOSTED WALKTHROUGH · ILLUSTRATIVE DATA'
              : 'LOCAL SANDBOX · POSTGRESQL SOURCE OF TRUTH'}
          </span>
          <h1>Trace one verified job to settlement.</h1>
          <p>
            {isHostedWalkthrough
              ? 'Step through the Mecharoon control loop without connecting a database, wallet, or payment rail.'
              : 'Run the complete Mecharoon wedge: delegated authority, atomic reservation, failed evidence, settlement uncertainty, reconciliation, FinalReceipt, and a higher next-job limit.'}
          </p>
          <div className={styles.badges} aria-label="Demo boundaries">
            <span>OFFCHAIN CONTROL</span>
            <span>
              {isHostedWalkthrough ? 'NO PRODUCTION API' : 'SIMULATED ONCHAIN'}
            </span>
            <span>NO REAL FUNDS</span>
          </div>
        </div>

        <div className={styles.runPanel}>
          <span className={styles.panelLabel}>
            {isHostedWalkthrough
              ? 'EIGHT-STATE PRODUCT WALKTHROUGH'
              : 'DETERMINISTIC GOLDEN LOOP'}
          </span>
          <strong>$20 → $15 → $5 → receipt → $10 cap</strong>
          <p>
            {isHostedWalkthrough
              ? 'A fixed client-side replay of the deterministic flow verified by the local PostgreSQL test suite. No production API, database, blockchain, wallet, or real funds are used.'
              : 'Each authorized run creates an isolated authority tree and reads the result back from the database.'}
          </p>
          {isHostedWalkthrough ? (
            <button
              className={styles.runButton}
              type="button"
              onClick={() => setWalkthroughStep(1)}
            >
              {walkthroughStep === 0
                ? 'Start the walkthrough'
                : 'Restart from delegation'}
            </button>
          ) : enabled ? (
            <>
              <label className={styles.tokenField}>
                <span>LOCAL DEMO TOKEN</span>
                <input
                  type="password"
                  value={demoToken}
                  onChange={(event) => setDemoToken(event.target.value)}
                  placeholder="Enter MECHAROON_DEMO_TOKEN"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="demo-token-boundary"
                />
              </label>
              <button
                className={styles.runButton}
                type="button"
                onClick={runDemo}
                disabled={state === 'running' || !demoToken.trim()}
              >
                {state === 'running'
                  ? 'Running transactions…'
                  : result
                    ? 'Run a fresh proof'
                    : 'Run verified settlement'}
              </button>
            </>
          ) : null}
          {!isHostedWalkthrough && (
            <span className={styles.boundary} id="demo-token-boundary">
              Kept in memory for this tab only. The route is unavailable in
              production.
            </span>
          )}
        </div>
      </section>

      <section className={styles.contract}>
        {[
          ['01', 'Atomic authority', 'Every reservation locks root to leaf.'],
          ['02', 'Honest uncertainty', 'Unknown never becomes failed or free.'],
          ['03', 'Receipt finality', 'Reputation waits for reconciliation.'],
          ['04', 'Compounding trust', 'Finalized work changes the next limit.'],
        ].map(([number, title, copy]) => (
          <article key={number}>
            <span>{number}</span>
            <strong>{title}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <div className={styles.statusRegion} aria-live="polite">
        {state === 'running' && (
          <p className={styles.running}>Executing eight durable state changes…</p>
        )}
        {state === 'error' && (
          <p className={styles.error}>
            <strong>Run failed.</strong> {error}
          </p>
        )}
      </div>

      {isHostedWalkthrough && activeWalkthroughStep && (
        <section className={styles.walkthrough} aria-live="polite">
          <div className={styles.walkthroughHeader}>
            <div>
              <span className={styles.eyebrow}>
                STEP {String(activeWalkthroughStep.step).padStart(2, '0')} OF{' '}
                {HOSTED_WALKTHROUGH_STEPS.length}
              </span>
              <h2>{activeWalkthroughStep.code.replaceAll('_', ' ')}</h2>
            </div>
            <span className={styles.complete}>
              {activeWalkthroughStep.status.toUpperCase()}
            </span>
          </div>

          <p className={styles.walkthroughDetail}>
            {activeWalkthroughStep.detail}
          </p>

          <div className={styles.snapshot} aria-label="Illustrative ledger state">
            {[
              ['AUTHORITY', activeWalkthroughStep.authority],
              ['RESERVED', activeWalkthroughStep.reserved],
              ['SETTLEMENT', activeWalkthroughStep.settlement],
              ['NEXT LIMIT', activeWalkthroughStep.next_limit],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <ol className={styles.stepRail} aria-label="Walkthrough steps">
            {HOSTED_WALKTHROUGH_STEPS.map((step) => (
              <li key={step.step}>
                <button
                  type="button"
                  className={
                    step.step === walkthroughStep ? styles.stepActive : undefined
                  }
                  onClick={() => setWalkthroughStep(step.step)}
                  aria-current={
                    step.step === walkthroughStep ? 'step' : undefined
                  }
                  aria-label={`Step ${step.step}: ${step.code.replaceAll('_', ' ')}`}
                >
                  <span>{String(step.step).padStart(2, '0')}</span>
                  <b>{step.code.replaceAll('_', ' ')}</b>
                </button>
              </li>
            ))}
          </ol>

          <div className={styles.walkthroughActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                setWalkthroughStep((current) => Math.max(1, current - 1))
              }
              disabled={walkthroughStep === 1}
            >
              Previous state
            </button>
            <button
              type="button"
              className={styles.runButton}
              onClick={() =>
                setWalkthroughStep((current) =>
                  current === HOSTED_WALKTHROUGH_STEPS.length
                    ? 1
                    : current + 1,
                )
              }
            >
              {walkthroughStep === HOSTED_WALKTHROUGH_STEPS.length
                ? 'Replay walkthrough'
                : `Next: ${HOSTED_WALKTHROUGH_STEPS[walkthroughStep]?.code.replaceAll('_', ' ')}`}
            </button>
          </div>
        </section>
      )}

      {displayResult && (
        <section className={styles.result}>
          <header className={styles.resultHeader}>
            <div>
              <span className={styles.eyebrow}>
                {isHostedWalkthrough ? 'ILLUSTRATIVE RECEIPT' : `RUN ${result?.run_id}`}
              </span>
              <h2>
                {isHostedWalkthrough
                  ? 'An illustrative FinalReceipt closes the loop.'
                  : 'Verified settlement completed.'}
              </h2>
            </div>
            <span className={styles.complete}>
              {isHostedWalkthrough ? 'SAMPLE · NOT SIGNED' : 'SIMULATED CONFIRMED'}
            </span>
          </header>

          <div className={styles.metrics}>
            <article>
              <span>ROOT AUTHORITY</span>
              <strong>{dollars(displayResult.authority.root.limit_minor)}</strong>
              <small>shared ceiling</small>
            </article>
            <article>
              <span>CHILD GRANT</span>
              <strong>{dollars(displayResult.authority.child.limit_minor)}</strong>
              <small>attenuated authority</small>
            </article>
            <article>
              <span>SETTLED WORK</span>
              <strong>
                {dollars(displayResult.receipt.receipt.work_order.amount_minor)}
              </strong>
              <small>after PASS + reconciliation</small>
            </article>
            <article>
              <span>NEXT JOB CAP</span>
              <strong>
                {dollars(displayResult.reputation.after.max_job_amount_minor)}
              </strong>
              <small>{displayResult.reputation.after.route_code}</small>
            </article>
          </div>

          <div className={styles.proofGrid}>
            <div className={styles.timeline}>
              <div className={styles.sectionTitle}>
                <span>CONTROL TRACE</span>
                <b>{displayResult.timeline.length} STATES</b>
              </div>
              <ol>
                {displayResult.timeline.map((item) => (
                  <li key={item.step}>
                    <span>{String(item.step).padStart(2, '0')}</span>
                    <div>
                      <div>
                        <strong>{item.code.replaceAll('_', ' ')}</strong>
                        <b>{item.status}</b>
                      </div>
                      <p>{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className={styles.receipt}>
              <div className={styles.receiptTop}>
                <div>
                  <Image
                    src="/brand/mecharoon-symbol-micro-reverse.svg"
                    width={24}
                    height={24}
                    alt=""
                    aria-hidden="true"
                  />
                  <span>FINAL RECEIPT</span>
                </div>
                <b>v0</b>
              </div>
              <dl>
                <div>
                  <dt>Task</dt>
                  <dd>{displayResult.receipt.receipt.work_order.task_ref}</dd>
                </div>
                <div>
                  <dt>Verdict</dt>
                  <dd>
                    {displayResult.receipt.receipt.verdict.outcome.toUpperCase()} ·{' '}
                    {displayResult.receipt.receipt.verdict.revision_count} revision
                  </dd>
                </div>
                <div>
                  <dt>
                    {isHostedWalkthrough ? 'Sample receipt' : 'Receipt hash'}
                  </dt>
                  <dd>{shortHash(displayResult.receipt.receipt_hash)}</dd>
                </div>
                <div>
                  <dt>
                    {isHostedWalkthrough ? 'Sample transaction' : 'Simulated tx'}
                  </dt>
                  <dd>
                    {shortHash(displayResult.receipt.receipt.settlement.tx_hash)}
                  </dd>
                </div>
                <div>
                  <dt>Finality</dt>
                  <dd>{displayResult.receipt.receipt.settlement.finality}</dd>
                </div>
              </dl>
              <p>
                The receipt includes commitments and lineage, not raw check
                output, credentials, or adapter signatures.
              </p>
            </aside>
          </div>

          <div className={styles.invariantPanel}>
            <div>
              <span className={styles.panelLabel}>QUARANTINE EVIDENCE</span>
              <strong>
                {dollars(
                  displayResult.authority.child.exposure_while_unknown
                    .reserved_minor,
                )}{' '}
                stayed reserved while settlement was unknown.
              </strong>
              <p>
                No receipt and no reputation event existed until the simulated
                adapter was reconciled as confirmed.
              </p>
            </div>
            <ul>
              {Object.entries(displayResult.proofs)
                .filter(([, value]) => typeof value === 'boolean')
                .map(([key, value]) => (
                  <li key={key}>
                    <span aria-hidden="true">{value ? '✓' : '×'}</span>
                    {key.replaceAll('_', ' ')}
                  </li>
                ))}
            </ul>
          </div>

          <details className={styles.raw}>
            <summary>
              {isHostedWalkthrough
                ? 'Inspect illustrative result'
                : 'Inspect raw API result'}
            </summary>
            <pre>{JSON.stringify(displayResult, null, 2)}</pre>
          </details>
        </section>
      )}

      <footer className={styles.footer}>
        <span>
          Mecharoon verified settlement{' '}
          {isHostedWalkthrough ? 'walkthrough' : 'sandbox'}
        </span>
        <span>
          Offchain control ·{' '}
          {isHostedWalkthrough
            ? 'illustrative settlement only'
            : 'simulated onchain finality'}
        </span>
      </footer>
    </main>
  );
}
