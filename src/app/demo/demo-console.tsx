'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';

import styles from './demo.module.css';

type TimelineItem = {
  step: number;
  code: string;
  status: string;
  detail: string;
};

type Exposure = {
  limit_minor: string;
  reserved_minor: string;
  settled_minor: string;
  available_minor: string;
};

type DemoResult = {
  run_id: string;
  mode: string;
  settlement_adapter: string;
  real_funds: boolean;
  timeline: TimelineItem[];
  authority: {
    root: {limit_minor: string; final_exposure: Exposure};
    child: {
      limit_minor: string;
      exposure_while_unknown: Exposure;
      final_exposure: Exposure;
    };
  };
  receipt: {
    receipt_id: string;
    receipt_hash: string;
    receipt: {
      work_order: {task_ref: string; amount_minor: string};
      verdict: {outcome: string; revision_count: number};
      settlement: {tx_hash: string; finality: string};
    };
  };
  reputation: {
    before: {max_job_amount_minor: string; route_code: string};
    after: {
      max_job_amount_minor: string;
      route_code: string;
      sample_size: number;
    };
  };
  proofs: Record<string, boolean | string | null>;
};

type ErrorEnvelope = {
  reason_code?: string;
  message?: string;
};

function dollars(minor: string): string {
  return `$${(Number(minor) / 100).toFixed(2)}`;
}

function shortHash(value: string | null | undefined): string {
  if (!value) return '—';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

export default function DemoConsole({enabled}: {enabled: boolean}) {
  const [result, setResult] = useState<DemoResult | null>(null);
  const [state, setState] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState('');
  const [demoToken, setDemoToken] = useState('');

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
            LOCAL SANDBOX · POSTGRESQL SOURCE OF TRUTH
          </span>
          <h1>One verified job. Every financial control state visible.</h1>
          <p>
            Run the complete Mecharoon wedge: delegated authority, atomic
            reservation, failed evidence, settlement uncertainty,
            reconciliation, FinalReceipt, and a higher next-job limit.
          </p>
          <div className={styles.badges} aria-label="Demo boundaries">
            <span>OFFCHAIN CONTROL</span>
            <span>SIMULATED ONCHAIN</span>
            <span>NO REAL FUNDS</span>
          </div>
        </div>

        <div className={styles.runPanel}>
          <span className={styles.panelLabel}>DETERMINISTIC GOLDEN LOOP</span>
          <strong>$20 → $15 → $5 → receipt → $10 cap</strong>
          <p>
            Each authorized run creates an isolated authority tree and reads
            the result back from the database.
          </p>
          {enabled ? (
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
          ) : (
            <div className={styles.disabled}>
              <strong>Local demo mode is off.</strong>
              <code>MECHAROON_DEMO_MODE=true npm run dev</code>
            </div>
          )}
          <span className={styles.boundary} id="demo-token-boundary">
            Kept in memory for this tab only. The route is unavailable in
            production.
          </span>
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

      {result && (
        <section className={styles.result}>
          <header className={styles.resultHeader}>
            <div>
              <span className={styles.eyebrow}>RUN {result.run_id}</span>
              <h2>Verified settlement completed.</h2>
            </div>
            <span className={styles.complete}>SIMULATED CONFIRMED</span>
          </header>

          <div className={styles.metrics}>
            <article>
              <span>ROOT AUTHORITY</span>
              <strong>{dollars(result.authority.root.limit_minor)}</strong>
              <small>shared ceiling</small>
            </article>
            <article>
              <span>CHILD GRANT</span>
              <strong>{dollars(result.authority.child.limit_minor)}</strong>
              <small>attenuated authority</small>
            </article>
            <article>
              <span>SETTLED WORK</span>
              <strong>
                {dollars(result.receipt.receipt.work_order.amount_minor)}
              </strong>
              <small>after PASS + reconciliation</small>
            </article>
            <article>
              <span>NEXT JOB CAP</span>
              <strong>
                {dollars(result.reputation.after.max_job_amount_minor)}
              </strong>
              <small>{result.reputation.after.route_code}</small>
            </article>
          </div>

          <div className={styles.proofGrid}>
            <div className={styles.timeline}>
              <div className={styles.sectionTitle}>
                <span>CONTROL TRACE</span>
                <b>{result.timeline.length} STATES</b>
              </div>
              <ol>
                {result.timeline.map((item) => (
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
                  <dd>{result.receipt.receipt.work_order.task_ref}</dd>
                </div>
                <div>
                  <dt>Verdict</dt>
                  <dd>
                    {result.receipt.receipt.verdict.outcome.toUpperCase()} ·{' '}
                    {result.receipt.receipt.verdict.revision_count} revision
                  </dd>
                </div>
                <div>
                  <dt>Receipt hash</dt>
                  <dd>{shortHash(result.receipt.receipt_hash)}</dd>
                </div>
                <div>
                  <dt>Simulated tx</dt>
                  <dd>
                    {shortHash(result.receipt.receipt.settlement.tx_hash)}
                  </dd>
                </div>
                <div>
                  <dt>Finality</dt>
                  <dd>{result.receipt.receipt.settlement.finality}</dd>
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
                  result.authority.child.exposure_while_unknown.reserved_minor,
                )}{' '}
                stayed reserved while settlement was unknown.
              </strong>
              <p>
                No receipt and no reputation event existed until the simulated
                adapter was reconciled as confirmed.
              </p>
            </div>
            <ul>
              {Object.entries(result.proofs)
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
            <summary>Inspect raw API result</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </section>
      )}

      <footer className={styles.footer}>
        <span>Mecharoon verified settlement sandbox v0</span>
        <span>Offchain control · simulated onchain finality</span>
      </footer>
    </main>
  );
}
