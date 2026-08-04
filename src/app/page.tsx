'use client';

import Image from 'next/image';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {ArrowRightCircle, Menu, X} from 'lucide-react';

const heroVideoUrl = '/media/hero/mecharoon-money-flow.mp4';

const heroNavLinks = [
  {label: 'Boundary', href: '#boundary'},
  {label: 'Control loop', href: '#flow'},
  {label: 'Proof', href: '#proof'},
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

const evidenceReveal = {
  duration: 0.68,
  ease: [0.22, 1, 0.36, 1] as const,
};

const evidenceCanvasVariants = {
  hidden: {
    opacity: 0,
    y: 22,
    clipPath: 'inset(0 0 100% 0 round 34px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    clipPath: 'inset(0 0 0 0 round 34px)',
    transition: {
      duration: 0.82,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: 0.17,
    },
  },
};

const subscribeToHydration = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
}

function MicroTransfer({
  label,
  value,
  reducedMotion,
}: {
  label: string;
  value: string;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="micro-transfer"
      aria-hidden="true"
      initial={reducedMotion ? false : {opacity: 0, x: 68}}
      whileInView={{opacity: 1, x: 0}}
      viewport={{once: true, amount: 0.3}}
      transition={{
        ...evidenceReveal,
        duration: reducedMotion ? 0 : evidenceReveal.duration,
        delay: reducedMotion ? 0 : 0.22,
      }}
    >
      <i />
      <small>{label}</small>
      <strong>{value}</strong>
      <b>→</b>
    </motion.div>
  );
}

function EvidenceSweep({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  if (reducedMotion) {
    return null;
  }

  return (
    <motion.span
      className="evidence-sweep"
      aria-hidden="true"
      initial={reducedMotion ? false : {opacity: 0, scaleX: 0}}
      whileInView={{opacity: [0, 0.7, 0], scaleX: 1}}
      viewport={{once: true, amount: 0.3}}
      transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
    />
  );
}

function ChapterFooter({
  lead,
  chapter,
}: {
  lead: string;
  chapter: string;
}) {
  return (
    <div className="evidence-chapter-foot">
      <span>{lead}</span>
      <span>{chapter}</span>
    </div>
  );
}

function ControlLoopSection({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <motion.section
      className="evidence-chapter evidence-control"
      id="flow"
      data-chapter="02"
      initial={reducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{once: true, amount: 0.2}}
    >
      <div className="shell evidence-shell">
        <EvidenceSweep reducedMotion={reducedMotion} />
        <motion.div
          className="evidence-copy"
          initial={reducedMotion ? false : {opacity: 0, y: 24}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            ...evidenceReveal,
            duration: reducedMotion ? 0 : evidenceReveal.duration,
            delay: reducedMotion ? 0 : 0.09,
          }}
        >
          <span className="evidence-kicker">
            <i /> One closed loop
          </span>
          <h2>
            A payment rail sees money.
            <span>Mecharoon sees the job.</span>
          </h2>
          <p>
            The financial decision stays attached to the work—from delegated
            authority through final settlement.
          </p>
        </motion.div>

        <MicroTransfer
          label="Committed evidence"
          value="3 facts"
          reducedMotion={reducedMotion}
        />

        <motion.div
          className="evidence-canvas control-canvas"
          aria-label="Define, reserve, and reconcile flow"
          variants={reducedMotion ? undefined : evidenceCanvasVariants}
          initial={reducedMotion ? false : undefined}
          animate={
            reducedMotion
              ? {
                  opacity: 1,
                  y: 0,
                  clipPath: 'inset(0 0 0 0 round 34px)',
                }
              : undefined
          }
          transition={reducedMotion ? {duration: 0} : undefined}
        >
          <div className="canvas-meta">
            <span>WORK ORDER · W-0187</span>
            <span>SIMULATED SETTLEMENT</span>
          </div>

          <svg className="flow-map" viewBox="0 0 760 430" aria-hidden="true">
            <defs>
              <linearGradient id="flow-gradient" x1="0" x2="1">
                <stop offset="0" stopColor="#a58aff" />
                <stop offset=".52" stopColor="#7342e2" />
                <stop offset="1" stopColor="#2c755f" />
              </linearGradient>
            </defs>
            <path
              className="flow-ghost"
              d="M42 297 C176 297 170 121 324 121 S470 306 621 306 C681 306 706 272 726 240"
            />
            <path
              className="flow-live"
              d="M42 297 C176 297 170 121 324 121 S470 306 621 306 C681 306 706 272 726 240"
            />
            {!reducedMotion && (
              <g className="flow-signal">
                <circle r="21" />
                <text x="0" y="4">
                  $5
                </text>
                <animateMotion
                  dur="5.4s"
                  repeatCount="indefinite"
                  path="M42 297 C176 297 170 121 324 121 S470 306 621 306 C681 306 706 272 726 240"
                />
              </g>
            )}
          </svg>

          <div className="flow-stage flow-stage-start">
            <b>01</b>
            <div>
              <small>RESERVE</small>
              <strong>$5 held open</strong>
            </div>
          </div>
          <div className="flow-stage flow-stage-mid">
            <b>02</b>
            <div>
              <small>VERIFY</small>
              <strong>REVISE → PASS</strong>
            </div>
          </div>
          <div className="flow-stage flow-stage-end">
            <b>03</b>
            <div>
              <small>RECONCILE</small>
              <strong>quarantined → confirmed</strong>
            </div>
          </div>

          <div className="evidence-receipt-pill">
            <span>FINAL RECEIPT</span>
            <strong>R-0187</strong>
            <i>COMMITTED</i>
          </div>
        </motion.div>

        <ChapterFooter
          lead="Unknown settlement stays quarantined until proven"
          chapter="02 / Control loop"
        />
      </div>
    </motion.section>
  );
}

function DeveloperProofSection({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <motion.section
      className="evidence-chapter evidence-proof"
      id="proof"
      data-chapter="03"
      initial={reducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{once: true, amount: 0.2}}
    >
      <div className="shell evidence-shell">
        <EvidenceSweep reducedMotion={reducedMotion} />
        <motion.div
          className="evidence-copy"
          initial={reducedMotion ? false : {opacity: 0, y: 24}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            ...evidenceReveal,
            duration: reducedMotion ? 0 : evidenceReveal.duration,
            delay: reducedMotion ? 0 : 0.09,
          }}
        >
          <span className="evidence-kicker">
            <i /> Clearing API for agent work
          </span>
          <h2>
            One request.
            <span>One bounded outcome.</span>
          </h2>
          <p>
            Send a task, budget, and frozen acceptance rule. Get back a verdict,
            settlement authorization, and a receipt your platform can act on.
          </p>
          <SectionActions
            primaryLabel="Run the sandbox"
            primaryHref="/demo"
            secondaryLabel="View API docs"
            secondaryHref="https://github.com/jh1nresh/mecharoon"
          />
        </motion.div>

        <MicroTransfer
          label="Final receipt"
          value="R-0187"
          reducedMotion={reducedMotion}
        />

        <motion.div
          className="evidence-canvas proof-canvas"
          aria-label="API request resolving into a final receipt"
          variants={reducedMotion ? undefined : evidenceCanvasVariants}
          initial={reducedMotion ? false : undefined}
          animate={
            reducedMotion
              ? {
                  opacity: 1,
                  y: 0,
                  clipPath: 'inset(0 0 0 0 round 34px)',
                }
              : undefined
          }
          transition={reducedMotion ? {duration: 0} : undefined}
        >
          <div className="proof-topline">
            <span>
              <b>POST</b> /v0/work-orders
            </span>
            <i>SIMULATION</i>
          </div>

          <div className="request-stub">
            <small>REQUEST</small>
            <strong>task + budget + rule</strong>
            <span>7D9A…31F2</span>
          </div>

          <div className="proof-rule">
            <div className="rule-progress" />
          </div>

          <dl className="proof-ledger">
            <div>
              <dt>01 / AUTHORITY</dt>
              <dd>$15.00</dd>
              <span>parent limit</span>
            </div>
            <div>
              <dt>02 / RESERVED</dt>
              <dd>$5.00</dd>
              <span>W-0187</span>
            </div>
            <div>
              <dt>03 / EVIDENCE</dt>
              <dd className="proof-pass">PASS</dd>
              <span>3 facts + citations</span>
            </div>
            <div>
              <dt>04 / NEXT LIMIT</dt>
              <dd>$10.00</dd>
              <span>contextual</span>
            </div>
          </dl>

          <div className="proof-arcline">
            <span>OPT-IN SETTLEMENT ADAPTER</span>
            <strong>ARC TESTNET · ERC-8183</strong>
            <small>chain 5042002 · 0x0747…4583 · USDC 6dp · testnet only</small>
          </div>

          <div className="evidence-receipt-sheet">
            <span className="receipt-check">✓</span>
            <small>FINAL RECEIPT</small>
            <strong>R-0187</strong>
            <i>OUTCOME COMMITTED</i>
          </div>
        </motion.div>

        <ChapterFooter
          lead="Illustrative sandbox · no funds moved"
          chapter="03 / Developer proof"
        />
      </div>
    </motion.section>
  );
}

function ExpressiveBoundarySection({
  reducedMotion,
}: {
  reducedMotion: boolean | null;
}) {
  return (
    <motion.section
      className="evidence-chapter evidence-boundary"
      id="boundary"
      data-chapter="01"
      initial={reducedMotion ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{once: true, amount: 0.2}}
    >
      <div className="shell evidence-shell">
        <EvidenceSweep reducedMotion={reducedMotion} />
        <motion.div
          className="evidence-copy"
          initial={reducedMotion ? false : {opacity: 0, y: 24}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, amount: 0.3}}
          transition={{
            ...evidenceReveal,
            duration: reducedMotion ? 0 : evidenceReveal.duration,
            delay: reducedMotion ? 0 : 0.09,
          }}
        >
          <span className="evidence-kicker">
            <i /> Bounded monetary authority
          </span>
          <h2>
            Every paid agent job needs
            <span>a boundary.</span>
          </h2>
          <p>
            Delegate only what the job needs. Reserve one amount. Anything
            outside the boundary is refused before money moves.
          </p>
          <SectionActions
            primaryLabel="See one job clear"
            primaryHref="/demo"
            secondaryLabel="Follow the loop"
            secondaryHref="#flow"
          />
        </motion.div>

        <MicroTransfer
          label="Work order"
          value="W-0187"
          reducedMotion={reducedMotion}
        />

        <motion.div
          className="boundary-canvas"
          aria-label="Nested delegated authority boundaries"
          variants={reducedMotion ? undefined : evidenceCanvasVariants}
          initial={reducedMotion ? false : undefined}
          animate={
            reducedMotion
              ? {
                  opacity: 1,
                  y: 0,
                  clipPath: 'inset(0 0 0 0 round 34px)',
                }
              : undefined
          }
          transition={reducedMotion ? {duration: 0} : undefined}
        >
          <div className="boundary-meta">
            <span>AUTHORITY PATH · A-002</span>
            <i>BOUNDED</i>
          </div>

          <svg className="boundary-map" viewBox="0 0 720 530" aria-hidden="true">
            <defs>
              <linearGradient id="boundary-accent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7342e2" />
                <stop offset=".58" stopColor="#9275ee" />
                <stop offset="1" stopColor="#2c755f" />
              </linearGradient>
            </defs>
            <motion.path
              className="boundary-line boundary-outer"
              d="M620 68 H238 C146 68 82 136 82 228 V472"
              variants={
                reducedMotion
                  ? undefined
                  : {
                      hidden: {pathLength: 0, opacity: 0},
                      visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: {
                          duration: 0.95,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }
              }
              initial={reducedMotion ? false : undefined}
              animate={
                reducedMotion ? {pathLength: 1, opacity: 1} : undefined
              }
              transition={reducedMotion ? {duration: 0} : undefined}
            />
            <motion.path
              className="boundary-line boundary-middle"
              d="M593 132 H284 C206 132 151 187 151 265 V453"
              variants={
                reducedMotion
                  ? undefined
                  : {
                      hidden: {pathLength: 0, opacity: 0},
                      visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: {
                          duration: 0.82,
                          delay: 0.12,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }
              }
              initial={reducedMotion ? false : undefined}
              animate={
                reducedMotion ? {pathLength: 1, opacity: 1} : undefined
              }
              transition={reducedMotion ? {duration: 0} : undefined}
            />
            <motion.path
              className="boundary-line boundary-inner"
              d="M560 207 H334 C268 207 225 250 225 316 V430"
              variants={
                reducedMotion
                  ? undefined
                  : {
                      hidden: {pathLength: 0, opacity: 0},
                      visible: {
                        pathLength: 1,
                        opacity: 1,
                        transition: {
                          duration: 0.72,
                          delay: 0.24,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }
              }
              initial={reducedMotion ? false : undefined}
              animate={
                reducedMotion ? {pathLength: 1, opacity: 1} : undefined
              }
              transition={reducedMotion ? {duration: 0} : undefined}
            />
            <motion.path
              className="boundary-seam"
              d="M560 207 H334 C268 207 225 250 225 316 V430"
              variants={
                reducedMotion
                  ? undefined
                  : {
                      hidden: {pathLength: 0, opacity: 0},
                      visible: {
                        pathLength: 0.34,
                        opacity: 1,
                        transition: {
                          duration: 0.5,
                          delay: 0.48,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }
              }
              initial={reducedMotion ? false : undefined}
              animate={
                reducedMotion ? {pathLength: 0.34, opacity: 1} : undefined
              }
              transition={reducedMotion ? {duration: 0} : undefined}
            />
          </svg>

          <div className="boundary-label boundary-parent">
            <small>PARENT</small>
            <strong>$15.00</strong>
          </div>
          <div className="boundary-label boundary-child">
            <small>CHILD</small>
            <strong>$5.00</strong>
          </div>
          <div className="boundary-label boundary-work">
            <small>WORK ORDER</small>
            <strong>W-0187</strong>
          </div>
          <div className="boundary-label boundary-denied">
            <small>NEW SELLER</small>
            <strong>$8.00 · DENIED</strong>
          </div>

          <div className="boundary-transaction">
            <span />
            <small>TRANSACTION</small>
          </div>

          <div className="boundary-final-receipt">
            <small>FINAL RECEIPT</small>
            <strong>R-0187</strong>
            <span>$5 · PASS · RECONCILED</span>
          </div>
        </motion.div>

        <ChapterFooter
          lead="Refused at the gate, not refunded after"
          chapter="01 / Authority boundary"
        />
      </div>
    </motion.section>
  );
}

export default function Home() {
  const userReducedMotion = useReducedMotion();
  const motionPreferencesReady = useHydrated();
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion =
    motionPreferencesReady && userReducedMotion === true;

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || !motionPreferencesReady) {
      return;
    }

    if (reducedMotion) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      // The poster remains the deterministic fallback when autoplay is denied.
    });
  }, [motionPreferencesReady, reducedMotion]);

  return (
    <div id="top">
      <Header />

      <main>
        <section className="vault-hero">
          <div className="vault-hero-media" aria-hidden="true">
            <video
              ref={heroVideoRef}
              className="vault-hero-video"
              autoPlay
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
              <motion.span
                className="vault-hero-kicker"
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <i /> Agent spend control plane
              </motion.span>

              <motion.h1
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <span>Verify agent work.</span> <span>Then pay.</span>
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

              <motion.div
                className="vault-hero-actions"
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <motion.a
                  className="vault-hero-cta"
                  href="#pilot"
                  whileHover={{scale: 1.04, filter: 'brightness(1.1)'}}
                  whileTap={{scale: 0.96}}
                >
                  <span>Join the pilot</span>
                  <ArrowRightCircle size={20} aria-hidden="true" />
                </motion.a>
                <a className="vault-hero-secondary" href="/demo">
                  Watch one job clear
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        <ExpressiveBoundarySection reducedMotion={reducedMotion} />

        <ControlLoopSection reducedMotion={reducedMotion} />

        <DeveloperProofSection reducedMotion={reducedMotion} />

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
              <span>
                Week one: your authority tree mapped, one job cleared end to
                end, and a receipt schema your finance team can file.
              </span>
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
