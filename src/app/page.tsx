'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import {useReducedMotion} from 'motion/react';

const stages = ['Delegate', 'Reserve', 'Execute', 'Evaluate', 'Settle', 'Reconcile', 'Receipt'];
const HERO_AUTOPLAY_DELAY_MS = 850;
const HERO_STAGE_DURATION_MS = 840;

const agents = [
  {
    id: 'search',
    name: 'Search Agent',
    verdict: 'PASS',
    amount: '$2.00',
    settlement: 'Settled onchain',
    detail: 'Accepted evidence can create a reservation-bound settlement instruction for the simulated onchain adapter.',
  },
  {
    id: 'extract',
    name: 'Extraction Agent',
    verdict: 'REVISE',
    amount: '$3.00',
    settlement: 'Open reservation',
    detail: 'Revision is requested. The reservation stays open while the child task remains active.',
  },
  {
    id: 'verify',
    name: 'Verification Agent',
    verdict: 'REVISE',
    amount: '$1.00',
    settlement: 'Open reservation',
    detail: 'A required check fails. The reservation remains open while corrected evidence is requested.',
  },
];

const modules = [
  {
    number: '01',
    name: 'Governor',
    description:
      'Set revocable limits for parent and child agents. Reserve against every ancestor before a task can spend.',
  },
  {
    number: '02',
    name: 'Settlement Interlock',
    description:
      'Compare the work order, committed evidence, and evaluator verdict before selecting the next payment action.',
  },
  {
    number: '03',
    name: 'Rail Relay',
    description:
      'Normalize submitted, unknown, confirmed, and mismatched states from the simulated settlement adapter.',
  },
  {
    number: '04',
    name: 'Work Receipt',
    description:
      'Create an append-only record linking authority, task, artifact, verdict, cost, and observed settlement state.',
  },
];

const benchmarkTargets = [
  '50 concurrent unique child attempts',
  'No ancestor budget violation',
  '50 identical keys create one reservation',
  'Unknown state retains full exposure',
  'Receipt and reputation wait for finality',
];

function BrandMark({
  variant = 'color',
  micro = false,
}: {
  variant?: 'color' | 'reverse';
  micro?: boolean;
}) {
  const asset = micro ? `mecharoon-symbol-micro-${variant}.svg` : `mecharoon-symbol-${variant}.svg`;

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
          <a href="#control">Control</a>
          <a href="/demo">Walkthrough</a>
          <a href="#architecture">Architecture</a>
          <a href="#benchmark">Benchmark</a>
        </nav>

        <a
          className="button button-small button-dark"
          href="#pilot"
        >
          Join pilot
        </a>
      </div>
    </header>
  );
}

type TransactionPanelProps = {
  currentStage: number;
  isRunning: boolean;
  onRun: () => void;
  selectedAgent: number;
  onSelectAgent: (index: number) => void;
};

function TransactionPanel({
  currentStage,
  isRunning,
  onRun,
  selectedAgent,
  onSelectAgent,
}: TransactionPanelProps) {
  const selected = agents[selectedAgent];
  const evaluated = currentStage >= 3;
  const reconciled = currentStage >= 5;

  return (
    <div className="transaction-frame" aria-label="Illustrative agent transaction">
      <div className="transaction-topline">
        <span>ILLUSTRATIVE TRANSACTION</span>
        <span className="live-state">
          <span className={isRunning ? 'pulse-dot is-running' : 'pulse-dot'} />
          {isRunning ? stages[currentStage] : 'Ready to replay'}
        </span>
      </div>

      <div className="budget-header">
        <div>
          <span className="mono-label">PARENT AUTHORITY</span>
          <strong>Research Agent</strong>
        </div>
        <div className="budget-value">
          <span>Budget</span>
          <strong>$20.00</strong>
        </div>
      </div>

      <div className="stage-track" aria-label={`Current stage: ${stages[currentStage]}`}>
        <span
          className="stage-progress"
          style={{
            transform: `scaleX(${currentStage / (stages.length - 1)})`,
          }}
          aria-hidden="true"
        />
        {stages.map((stage, index) => (
          <span
            className={[
              'stage-node',
              index <= currentStage ? 'is-complete' : '',
              index === currentStage ? 'is-current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={stage}
          >
            <i />
            <b>{stage}</b>
          </span>
        ))}
      </div>

      <div className="agent-list" aria-label="Delegated agent tasks">
        {agents.map((agent, index) => {
          const verdict = evaluated ? agent.verdict : 'PENDING';
          const settlement = reconciled ? agent.settlement : currentStage >= 1 ? 'Reserved' : 'Waiting';
          return (
            <button
              className={selectedAgent === index ? 'agent-row is-selected' : 'agent-row'}
              type="button"
              key={agent.id}
              onClick={() => onSelectAgent(index)}
              aria-pressed={selectedAgent === index}
            >
              <span className="agent-identity">
                <span className={`verdict-dot verdict-${verdict.toLowerCase()}`} />
                <span>
                  <strong>{agent.name}</strong>
                  <small>{settlement}</small>
                </span>
              </span>
              <span className={`verdict verdict-${verdict.toLowerCase()}`}>{verdict}</span>
              <strong className="agent-amount">{agent.amount}</strong>
            </button>
          );
        })}
      </div>

      <div className="agent-detail" aria-live="polite">
        <span>{selected.name}</span>
        <p>{selected.detail}</p>
      </div>

      <div className="transaction-summary">
        <div>
          <span>Settled onchain</span>
          <strong>{reconciled ? '$2.00' : 'Pending'}</strong>
        </div>
        <div>
          <span>Open reservation</span>
          <strong>{reconciled ? '$4.00' : 'Pending'}</strong>
        </div>
        <div>
          <span>Released</span>
          <strong>{reconciled ? '$0.00' : 'Pending'}</strong>
        </div>
        <div className="available-row">
          <span>Available</span>
          <strong>$14.00</strong>
        </div>
      </div>

      <div className="receipt-strip">
        <div>
          <span className="mono-label">RECEIPT</span>
          <strong>{currentStage >= 6 ? 'demo_01' : 'pending'}</strong>
        </div>
        <div>
          <span className="mono-label">ONCHAIN FINALITY</span>
          <strong>simulated</strong>
        </div>
        <button className="replay-button" type="button" onClick={onRun} disabled={isRunning}>
          {isRunning ? 'Running' : 'Replay flow'}
        </button>
      </div>

      <p className="transaction-note">
        V0 evaluates work offchain before approved value settles through a simulated onchain adapter.
      </p>
    </div>
  );
}

function TaskTree() {
  return (
    <div className="task-tree" aria-label="Shared ancestor budget task tree">
      <div className="tree-parent">
        <span className="tree-kicker">SHARED ANCESTOR LIMIT</span>
        <div>
          <strong>Parent Research Agent</strong>
          <b>$20.00</b>
        </div>
        <span className="budget-bar">
          <i style={{width: '30%'}} />
        </span>
        <small>$6 reserved across descendants · $14 not yet reserved</small>
      </div>

      <div className="tree-connector" aria-hidden="true">
        <span />
      </div>

      <div className="tree-children">
        {agents.map((agent) => (
          <div className="tree-child" key={agent.id}>
            <span className={`tree-status verdict-${agent.verdict.toLowerCase()}`}>{agent.verdict}</span>
            <strong>{agent.name}</strong>
            <div>
              <span>Reserved</span>
              <b>{agent.amount}</b>
            </div>
          </div>
        ))}
      </div>

      <div className="blocked-retry">
        <span>RETRY 02</span>
        <strong>Blocked before spend</strong>
        <small>Ancestor-aware reservation sees the same shared limit.</small>
      </div>
    </div>
  );
}

function ArchitectureLoop() {
  return (
    <div className="architecture-loop">
      <div className="loop-center" aria-hidden="true">
        <span>CLOSED</span>
        <strong>LOOP</strong>
      </div>
      {modules.map((item) => {
        return (
          <article className="module" key={item.name}>
            <div className="module-heading">
              <span>{item.number}</span>
            </div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </article>
        );
      })}
    </div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [currentStage, setCurrentStage] = useState(stages.length - 1);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [pageIsVisible, setPageIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageIsVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (hasAutoPlayed || reduceMotion !== false || !pageIsVisible) return;

    const timer = window.setTimeout(() => {
      setHasAutoPlayed(true);
      setSelectedAgent(0);
      setCurrentStage(0);
      setIsRunning(true);
    }, HERO_AUTOPLAY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hasAutoPlayed, pageIsVisible, reduceMotion]);

  useEffect(() => {
    if (!isRunning || !pageIsVisible) return;

    if (reduceMotion || currentStage >= stages.length - 1) return;

    const timer = window.setTimeout(() => {
      const nextStage = currentStage + 1;
      setCurrentStage(nextStage);
      if (nextStage === stages.length - 1) setIsRunning(false);
    }, HERO_STAGE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [currentStage, isRunning, pageIsVisible, reduceMotion]);

  const runDemo = () => {
    setHasAutoPlayed(true);
    setSelectedAgent(0);
    if (reduceMotion) {
      setCurrentStage(stages.length - 1);
      setIsRunning(false);
    } else {
      setCurrentStage(0);
      setIsRunning(true);
    }
  };

  const inspectStage = (index: number) => {
    setHasAutoPlayed(true);
    setIsRunning(false);
    setCurrentStage(index);
  };

  const inspectAgent = (index: number) => {
    setHasAutoPlayed(true);
    setSelectedAgent(index);
  };

  return (
    <div id="top">
      <Header />

      <main>
        <section className="hero shell" id="control">
          <div className="hero-copy hero-enter">
            <span className="hero-kicker">VERIFIED SETTLEMENT FOR AGENT WORK</span>
            <h1>
              Verify agent work.
              <br />
              {' '}Then pay.
            </h1>
            <p className="hero-subcopy">
              Mecharoon verifies agent work offchain and authorizes only
              approved value for onchain settlement. Finalized receipts set
              future limits and routing. This MVP uses a simulated adapter; no
              real funds move.
            </p>
            <div className="hero-actions">
              <a className="button button-accent" href="/demo">
                View walkthrough
              </a>
              <a
                className="button button-outline"
                href="#pilot"
              >
                Join pilot
              </a>
            </div>
          </div>

          <div className="hero-product hero-enter-delayed">
            <TransactionPanel
              currentStage={currentStage}
              isRunning={isRunning}
              onRun={runDemo}
              selectedAgent={selectedAgent}
              onSelectAgent={inspectAgent}
            />
          </div>
        </section>

        <section className="section section-rule shell">
          <div className="section-heading problem-heading">
            <h2>A wallet cap is not a task-tree budget.</h2>
            <p>
              Child agents, retries, and late settlements can all draw from one limit. Mecharoon reserves across
              the entire authority tree.
            </p>
          </div>

          <div className="problem-layout">
            <TaskTree />
            <ol className="problem-notes">
              <li>
                <span>01</span>
                <div>
                  <strong>Shared budget</strong>
                  <p>Every child draws against the same ancestor limits.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>External uncertainty</strong>
                  <p>A timeout is not a failed payment. Unknown states must be quarantined and reconciled.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Missing accountability</strong>
                  <p>Payment logs rarely explain which authority, task, artifact, or accepted result caused the spend.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section demo-section" id="demo">
          <div className="shell">
            <div className="section-heading demo-heading">
              <h2>Verify the work before approved value settles.</h2>
              <p>
                An external agent accepts a bounded work order. Mecharoon reserves its budget, records submitted
                evidence and the verdict, then settles only the approved outcome.
              </p>
            </div>

            <div className="demo-grid">
              <div className="flow-inspector">
                <div className="flow-tabs" role="tablist" aria-label="Transaction stages">
                  {stages.map((stage, index) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={currentStage === index}
                      className={currentStage === index ? 'flow-tab is-current' : 'flow-tab'}
                      onClick={() => inspectStage(index)}
                      key={stage}
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {stage}
                    </button>
                  ))}
                </div>

                <div className="flow-copy" aria-live="polite">
                  <span className="mono-label">NOW INSPECTING · {stages[currentStage].toUpperCase()}</span>
                  {currentStage === 0 && (
                    <>
                      <h3>Delegate bounded authority.</h3>
                      <p>The parent can create child tasks, but it cannot create more economic authority than it received.</p>
                    </>
                  )}
                  {currentStage === 1 && (
                    <>
                      <h3>Reserve through every ancestor.</h3>
                      <p>$2, $3, and $1 are reserved before execution. A retry sees the same shared limit.</p>
                    </>
                  )}
                  {currentStage === 2 && (
                    <>
                      <h3>Execute against one work order.</h3>
                      <p>Each child task carries its authority path, idempotency key, expected artifact, and payment intent.</p>
                    </>
                  )}
                  {currentStage === 3 && (
                    <>
                      <h3>Evaluate the committed evidence.</h3>
                      <p>Search passes; extraction and verification need revised evidence under the declared evaluator policy.</p>
                    </>
                  )}
                  {currentStage === 4 && (
                    <>
                      <h3>Settle only the approved outcome.</h3>
                      <p>A reservation-bound instruction sends the accepted $2 to the simulated onchain adapter.</p>
                    </>
                  )}
                  {currentStage === 5 && (
                    <>
                      <h3>Reconcile observed onchain state.</h3>
                      <p>Confirm $2 and keep $4 reserved for revision. Unknown states are quarantined, not retried blindly.</p>
                    </>
                  )}
                  {currentStage === 6 && (
                    <>
                      <h3>Close with one work receipt.</h3>
                      <p>The receipt links authority, task, artifact, verdict, cost, and observed onchain settlement state.</p>
                    </>
                  )}
                </div>

                <button className="button button-dark run-button" type="button" onClick={runDemo} disabled={isRunning}>
                  {isRunning ? 'Running control flow' : 'Run the full sequence'}
                </button>
              </div>

              <div className="work-receipt">
                <div className="receipt-header">
                  <div>
                    <BrandMark variant="reverse" micro />
                    <span>WORK RECEIPT</span>
                  </div>
                  <span className="receipt-id">demo_01</span>
                </div>
                <div className="receipt-state">
                  <span>LOCAL STATE</span>
                  <strong>{currentStage >= 6 ? 'CLOSED' : stages[currentStage].toUpperCase()}</strong>
                </div>
                <dl>
                  <div>
                    <dt>Authority</dt>
                    <dd>parent/research/*</dd>
                  </div>
                  <div>
                    <dt>Budget</dt>
                    <dd>$20.00</dd>
                  </div>
                  <div>
                    <dt>Reserved</dt>
                    <dd>{currentStage >= 1 ? '$6.00' : '$0.00'}</dd>
                  </div>
                  <div>
                    <dt>Settled onchain</dt>
                    <dd>{currentStage >= 5 ? '$2.00' : 'Pending'}</dd>
                  </div>
                  <div>
                    <dt>Open</dt>
                    <dd>{currentStage >= 5 ? '$4.00' : 'Pending'}</dd>
                  </div>
                  <div>
                    <dt>Released</dt>
                    <dd>{currentStage >= 5 ? '$0.00' : 'Pending'}</dd>
                  </div>
                  <div>
                    <dt>Onchain finality</dt>
                    <dd>simulated</dd>
                  </div>
                </dl>
                <div className="receipt-verdicts">
                  {agents.map((agent) => (
                    <span key={agent.id}>
                      <i className={`verdict-${currentStage >= 3 ? agent.verdict.toLowerCase() : 'pending'}`} />
                      {agent.name.replace(' Agent', '')}
                      <b>{currentStage >= 3 ? agent.verdict : 'PENDING'}</b>
                    </span>
                  ))}
                </div>
                <p>Illustrative only · Adapter finality is simulated · No customer funds are held by Mecharoon</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-rule shell" id="architecture">
          <div className="section-heading architecture-heading">
            <h2>Four modules. One closed loop.</h2>
            <p>
              Authority becomes reservation. Work becomes a verdict. External payment state returns as a
              finance-readable receipt.
            </p>
          </div>

          <ArchitectureLoop />

          <div className="rail-boundary">
            <div>
              <h3>Control above the rails.</h3>
              <p>
                V0 keeps authority, work orders, evidence, evaluation, receipts, and contextual reputation offchain.
                Only approved value settlement is submitted to the onchain adapter.
              </p>
            </div>
            <div className="adapter-targets">
              <span className="mono-label">FUTURE RAIL ADAPTERS · NOT PART OF V0</span>
              <div>
                <span>x402</span>
                <span>API credits</span>
                <span>Wallets</span>
                <span>Card authorizations</span>
                <span>Invoices</span>
              </div>
            </div>
          </div>

          <div className="api-surface">
            <div className="api-surface-copy">
              <span className="mono-label">HOSTED WALKTHROUGH</span>
              <h3>Deterministic answers for the next agent action.</h3>
              <p>
                Platforms inspect authority and reserve a work budget. A
                separate evaluator commits normalized evidence; a settlement
                operator reconciles the adapter result. Every response returns
                a stable status, reason code, and valid next actions.
              </p>
              <a className="button button-dark" href="/demo">
                Open walkthrough
              </a>
            </div>
            <div
              className="api-flow"
              aria-label="Mecharoon walkthrough API flow"
            >
              {[
                'getAuthorityExposure',
                'createWorkOrder',
                'evaluateSubmission',
                'executeSettlement',
                'reconcileSettlement',
                'getFinalReceipt',
              ].map((step, index) => (
                <span key={step}>
                  <b>{String(index + 1).padStart(2, '0')}</b>
                  <code>{step}</code>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section audience-section">
          <div className="shell">
            <div className="section-heading audience-heading">
              <h2>One transaction truth for everyone who owns the risk.</h2>
            </div>
            <div className="audience-list">
              <article>
                <span>01</span>
                <h3>Agent platforms</h3>
                <p>Add paid agent workflows without rebuilding budget and recovery logic inside every runtime.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Finance and FinOps</h3>
                <p>Trace each spend to its authorizer, work order, accepted result, and external payment state.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Security and reliability</h3>
                <p>Stop new descendant spend after revocation and quarantine uncertain payments instead of silently retrying.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section benchmark-section shell" id="benchmark">
          <div className="benchmark-copy">
            <h2>Proof before production.</h2>
            <p>
              The local PostgreSQL proof tests the failures that simple demos
              avoid: concurrent reservation, duplicate requests, unknown
              settlement, mismatched reconciliation, and premature reputation.
            </p>
            <p className="benchmark-truth">
              These are local sandbox results with a simulated adapter, not
              production or real-money evidence.
            </p>
          </div>

          <div className="benchmark-receipt">
            <div className="benchmark-header">
              <div>
                <BrandMark micro />
                <span>LOCAL SANDBOX RESULTS</span>
              </div>
              <b>PASSED</b>
            </div>
            <div className="benchmark-meta">
              <span>suite</span>
              <strong>ledger_failure_matrix_v0</strong>
              <span>status</span>
              <strong>VERIFIED LOCALLY</strong>
            </div>
            <ul>
              {benchmarkTargets.map((target, index) => (
                <li key={target}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{target}</strong>
                  <b>PASS</b>
                </li>
              ))}
            </ul>
            <div className="benchmark-footer">
              <span>Result hash</span>
              <strong>npm test · verified suite</strong>
            </div>
          </div>
        </section>

        <section className="final-cta" id="pilot">
          <div className="shell final-cta-inner">
            <div>
              <h2>Bring one paid agent workflow.</h2>
              <p>
                We&apos;ll map its authority tree, rail states, and finance-readable receipt before it touches
                production spend.
              </p>
            </div>
            <div className="final-actions">
              <a
                className="button button-accent"
                href="https://github.com/jh1nresh/mecharoon/issues/new?title=Mecharoon%20pilot"
                target="_blank"
                rel="noreferrer"
              >
                Join pilot
              </a>
              <span>No custody. No card issuing. No new payment rail.</span>
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
          <p>Financial control infrastructure for agentic work.</p>
          <div>
            <a href="https://github.com/jh1nresh/mecharoon" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="#control">
              Control model
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
