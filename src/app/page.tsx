'use client';

import Image from 'next/image';
import {useEffect, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {
  ArrowRightCircle,
  Check,
  Fingerprint,
  LockKeyhole,
  Menu,
  X,
  Zap,
} from 'lucide-react';

const heroVideoUrl =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_003132_8b7edcb6-c64d-4a52-a9ca-879942e122ad.mp4';

const heroNavLinks = [
  {label: 'Control loop', href: '#flow'},
  {label: 'Proof', href: '#proof'},
  {label: 'Boundary', href: '#boundary'},
  {label: 'Demo', href: '/demo'},
  {label: 'GitHub', href: 'https://github.com/jh1nresh/mecharoon'},
];

const fadeUp = {
  hidden: {opacity: 0, y: 28},
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.15,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const developerProofFacts = [
  {
    value: '50',
    label: 'concurrent attempts stayed inside the ancestor limit',
  },
  {
    value: '1',
    label: 'reservation survived 50 identical idempotency requests',
  },
  {
    value: '0',
    label: 'receipts existed before settlement finality',
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className="hero-header">
      <div className="hero-header-inner">
        <a className="brand" href="#top" aria-label="Mecharoon home">
          <BrandMark />
          <BrandWordmark />
        </a>

        <nav className="hero-desktop-nav" aria-label="Main navigation">
          {heroNavLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.href.startsWith('http')
                ? {target: '_blank', rel: 'noreferrer'}
                : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hero-header-actions">
          <a className="hero-nav-button hero-nav-button-primary" href="#pilot">
            Join pilot
          </a>
          <a className="hero-nav-button hero-nav-button-secondary" href="/demo">
            View demo
          </a>
        </div>

        <button
          className="hero-menu-toggle"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <Menu aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              className="hero-menu-backdrop"
              type="button"
              aria-label="Close navigation"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.24}}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              id="mobile-navigation"
              className="hero-menu-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              initial={{x: '100%'}}
              animate={{x: 0}}
              exit={{x: '100%'}}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="hero-menu-sheet-header">
                <a
                  className="brand"
                  href="#top"
                  aria-label="Mecharoon home"
                  onClick={() => setMenuOpen(false)}
                >
                  <BrandMark />
                  <BrandWordmark />
                </a>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close navigation"
                >
                  <X aria-hidden="true" />
                </button>
              </div>

              <nav className="hero-mobile-nav" aria-label="Mobile navigation">
                {heroNavLinks.map((link, index) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    initial={{opacity: 0, x: 22}}
                    animate={{opacity: 1, x: 0}}
                    transition={{
                      delay: 0.18 + index * 0.07,
                      duration: 0.36,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={() => setMenuOpen(false)}
                    {...(link.href.startsWith('http')
                      ? {target: '_blank', rel: 'noreferrer'}
                      : {})}
                  >
                    {link.label}
                  </motion.a>
                ))}
              </nav>

              <div className="hero-menu-actions">
                <a
                  className="hero-nav-button hero-nav-button-primary"
                  href="#pilot"
                  onClick={() => setMenuOpen(false)}
                >
                  Join pilot
                </a>
                <a
                  className="hero-nav-button hero-nav-button-secondary"
                  href="/demo"
                  onClick={() => setMenuOpen(false)}
                >
                  View demo
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function DeveloperProofConsole({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="developer-console"
      aria-label="Illustrative API request and reconciled response"
      initial={reducedMotion ? false : {opacity: 0, y: 36}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, amount: 0.28}}
      transition={{duration: 0.72, ease: [0.22, 1, 0.36, 1]}}
    >
      <header className="developer-console-head">
        <span>MECHAROON / SANDBOX</span>
        <span>SIMULATED SETTLEMENT · NO FUNDS MOVED</span>
      </header>

      <div className="developer-console-request">
        <div className="developer-console-label">
          <span>
            <strong>POST</strong> /v0/work-orders
          </span>
          <span>REQUEST</span>
        </div>
        <pre>{`{
  "job": "Verify pricing research",
  "budget": 500,
  "authority_limit": 1500,
  "acceptance_rule": {
    "pricing_facts": 3,
    "citations_required": true
  }
}`}</pre>
      </div>

      <div className="developer-console-response">
        <div className="developer-console-result">
          <div className="developer-console-label">
            <span className="developer-console-pass">201 · RECONCILED</span>
            <span>RESPONSE</span>
          </div>

          <dl>
            <div>
              <dt>Work order</dt>
              <dd>W-0187</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>A-0187</dd>
            </div>
            <div>
              <dt>Reserved</dt>
              <dd>$5.00</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd className="developer-console-pass">PASS</dd>
            </div>
            <div>
              <dt>Authorized</dt>
              <dd>$5.00</dd>
            </div>
            <div>
              <dt>Next limit</dt>
              <dd>$10.00</dd>
            </div>
          </dl>

          <div className="developer-console-foot">
            <span>RULE HASH · 7D9A…31F2</span>
            <span>IDEMPOTENT · AUDITABLE</span>
          </div>
        </div>

        <aside className="developer-console-receipt">
          <div className="developer-receipt-mark">
            <Check aria-hidden="true" />
          </div>
          <span>FINAL RECEIPT</span>
          <strong>R-0187</strong>
          <p>settlement reconciled</p>
          <p>outcome committed</p>
        </aside>
      </div>
    </motion.div>
  );
}

function BoundaryDiagram({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  const pathInitial = reducedMotion
    ? false
    : {pathLength: 0, opacity: 0};

  return (
    <motion.div
      className="boundary-art"
      aria-hidden="true"
      initial={reducedMotion ? false : {opacity: 0, x: 48}}
      whileInView={{opacity: 1, x: 0}}
      viewport={{once: true, amount: 0.32}}
      transition={{duration: 0.78, ease: [0.22, 1, 0.36, 1]}}
    >
      <svg viewBox="0 0 760 640" role="presentation">
        <motion.path
          className="boundary-band boundary-band-soft"
          strokeWidth="58"
          d="M 664 82 C 478 44, 282 146, 252 332 C 230 472, 310 570, 450 606"
          initial={pathInitial}
          whileInView={{pathLength: 1, opacity: 1}}
          viewport={{once: true, amount: 0.3}}
          transition={{duration: 1, ease: [0.22, 1, 0.36, 1]}}
        />
        <motion.path
          className="boundary-band"
          strokeWidth="28"
          d="M 650 104 C 502 76, 340 154, 310 326 C 288 446, 360 526, 470 552"
          initial={pathInitial}
          whileInView={{pathLength: 1, opacity: 1}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            delay: reducedMotion ? 0 : 0.14,
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <motion.path
          className="boundary-band"
          strokeWidth="15"
          d="M 625 166 C 510 144, 400 212, 386 334 C 376 420, 420 470, 500 488"
          initial={pathInitial}
          whileInView={{pathLength: 1, opacity: 1}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            delay: reducedMotion ? 0 : 0.28,
            duration: 0.82,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <motion.path
          className="boundary-reserve"
          strokeWidth="15"
          d="M 386 334 C 381 370, 387 398, 404 420"
          initial={pathInitial}
          whileInView={{pathLength: 1, opacity: 1}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            delay: reducedMotion ? 0 : 0.54,
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <path
          className="boundary-band boundary-band-route"
          strokeWidth="2"
          d="M 111 526 C 292 524, 448 514, 598 450"
        />
        <motion.circle
          className="boundary-transaction"
          cx="404"
          cy="420"
          r="16"
          initial={reducedMotion ? false : {scale: 0, opacity: 0}}
          whileInView={{scale: 1, opacity: 1}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            delay: reducedMotion ? 0 : 0.72,
            duration: 0.38,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <text className="boundary-route-label" x="532" y="140">
          DELEGATE
        </text>
        <text className="boundary-route-label" x="302" y="372">
          RESERVE
        </text>
        <text className="boundary-route-label" x="430" y="444">
          RECONCILE
        </text>
      </svg>
    </motion.div>
  );
}

function BoundaryReceipt({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="boundary-receipt"
      aria-label="Illustrative final receipt"
      initial={reducedMotion ? false : {opacity: 0, y: 44}}
      whileInView={{opacity: 1, y: 0}}
      viewport={{once: true, amount: 0.3}}
      transition={{
        delay: reducedMotion ? 0 : 0.28,
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="boundary-receipt-lead">
        <span>ILLUSTRATIVE SANDBOX · NO FUNDS MOVED</span>
        <strong>
          FinalReceipt <span>R-0187</span>
        </strong>
      </div>
      <div>
        <span>WORK ORDER</span>
        <strong>W-0187</strong>
      </div>
      <div>
        <span>DELEGATED LIMIT</span>
        <strong>$15.00</strong>
      </div>
      <div className="boundary-receipt-reserved">
        <span>RESERVED / PASSED</span>
        <strong>$5.00 · PASS</strong>
      </div>
      <div>
        <span>SETTLEMENT</span>
        <strong>RECONCILED</strong>
      </div>
      <div>
        <span>OUTCOME</span>
        <strong className="boundary-receipt-committed">
          <i aria-hidden="true" /> COMMITTED
        </strong>
      </div>
    </motion.div>
  );
}

function SectionActions({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}) {
  return (
    <div className="cinematic-actions">
      <motion.a
        className="cinematic-primary-cta"
        href={primaryHref}
        whileHover={{scale: 1.04, filter: 'brightness(1.1)'}}
        whileTap={{scale: 0.96}}
      >
        <span>{primaryLabel}</span>
        <ArrowRightCircle size={20} aria-hidden="true" />
      </motion.a>
      <a className="cinematic-secondary-cta" href={secondaryHref}>
        {secondaryLabel}
      </a>
    </div>
  );
}

function DeveloperProofSection({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <section className="developer-proof-section" id="proof">
      <div className="shell developer-proof-layout">
        <motion.div
          className="developer-proof-copy"
          initial={reducedMotion ? false : {opacity: 0, y: 30}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, amount: 0.3}}
          transition={{duration: 0.68, ease: [0.22, 1, 0.36, 1]}}
        >
          <span className="cinematic-kicker">Clearing API for agent work</span>
          <h2>One request. One bounded outcome.</h2>
          <p>
            Send a task, budget, and frozen acceptance rule. Get back a
            verdict, settlement authorization, and a receipt your platform can
            act on.
          </p>
          <SectionActions
            primaryLabel="Run the sandbox"
            primaryHref="/demo"
            secondaryLabel="View API docs"
            secondaryHref="https://github.com/jh1nresh/mecharoon"
          />

          <div className="developer-proof-endpoint">
            <strong>POST</strong> /v0/work-orders
          </div>

          <div className="developer-proof-facts">
            {developerProofFacts.map((fact) => (
              <div key={fact.value}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <DeveloperProofConsole reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

function ExpressiveBoundarySection({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <section className="expressive-boundary-section" id="boundary">
      <div className="shell expressive-boundary-stage">
        <motion.div
          className="expressive-boundary-copy"
          initial={reducedMotion ? false : {opacity: 0, y: 30}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, amount: 0.3}}
          transition={{duration: 0.68, ease: [0.22, 1, 0.36, 1]}}
        >
          <span className="cinematic-kicker">Bounded monetary authority</span>
          <h2>
            Every paid agent job needs <span>a boundary.</span>
          </h2>
          <p>
            Delegate only what the job needs. Reserve one amount. Release
            payment only after the committed evidence passes.
          </p>
          <SectionActions
            primaryLabel="See one job clear"
            primaryHref="/demo"
            secondaryLabel="Explore architecture"
            secondaryHref="#flow"
          />
        </motion.div>

        <BoundaryDiagram reducedMotion={reducedMotion} />
        <BoundaryReceipt reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}

export default function Home() {
  const reducedMotion = useReducedMotion();

  return (
    <div id="top">
      <Header />

      <main>
        <section className="vault-hero">
          <div className="vault-hero-media" aria-hidden="true">
            <video
              className="vault-hero-video"
              autoPlay={!reducedMotion}
              muted
              loop
              playsInline
              preload="auto"
              poster="/media/hero/mecharoon-money-flow-poster.jpg"
            >
              <source src={heroVideoUrl} type="video/mp4" />
            </video>
          </div>

          <div className="vault-hero-inner">
            <div className="vault-hero-copy">
              <motion.h1
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <Zap className="vault-heading-icon" aria-hidden="true" />
                <span>Verify agent work.</span>
                <LockKeyhole
                  className="vault-heading-icon"
                  aria-hidden="true"
                />
                <span>Then pay.</span>
                <Fingerprint
                  className="vault-heading-icon"
                  aria-hidden="true"
                />
              </motion.h1>

              <motion.p
                className="vault-hero-subcopy"
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                Set the job, cap the budget, and define what counts as done.
                Mecharoon reserves the budget, checks the result, and approves
                payment only when the work passes.
              </motion.p>

              <motion.a
                className="vault-hero-cta"
                href="#pilot"
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                whileHover={{scale: 1.04, filter: 'brightness(1.1)'}}
                whileTap={{scale: 0.96}}
              >
                <span>Join the pilot</span>
                <ArrowRightCircle size={20} aria-hidden="true" />
              </motion.a>
            </div>
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

        <DeveloperProofSection reducedMotion={reducedMotion} />

        <ExpressiveBoundarySection reducedMotion={reducedMotion} />

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
