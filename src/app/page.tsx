'use client';

import Image from 'next/image';
import {useEffect, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {
  ArrowRightCircle,
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
