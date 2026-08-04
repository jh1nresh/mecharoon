# Mecharoon Editorial Evidence System

## Design Thesis

The Hero owns the cinematic 3D moment. The three following chapters explain
Mecharoon with a quieter 2D financial-evidence system: one claim, one dominant
object, one visible state transition, and one inspectable receipt per chapter.

## Experience Budget

- Trust: 50%
- Control: 35%
- Guidance: 15%
- Desired: professional, technological, calm, exact, and visibly alive.
- Avoid: dashboard collage, generic AI SaaS, crypto spectacle, simulated 3D,
  decorative motion, or claims beyond the hosted sandbox.

## Tokens

- Deep Ink `#192837` / `#0B1F2A`: authority, transaction, receipt, primary copy.
- Purple `#7342E2`: CTA and in-flight delegated work only.
- Reserved Green `#2C755F`: reserved, PASS, reconciled, committed.
- Warm editorial field `#F3F1EE → #E8E5E1`: neutral evidence environment.
- Hairlines use Deep Ink at 8–14% opacity.

## Navigation and Viewport

- Existing Hero navigation and anchors remain unchanged.
- Desktop reference: 1440×900 per chapter.
- Mobile reference: 390×844 per chapter.
- Copy remains first in DOM order; the dominant object follows.
- Mobile removes the secondary CTA and simplifies supporting metadata rather
  than shrinking it below legibility.

## Component Inventory

- `EvidenceSweep`: one semantic line sweep at chapter entry.
- `MicroTransfer`: Work order → committed evidence → FinalReceipt handoff.
- `ControlLoopSection`: one continuous Define → Reserve → Reconcile path.
- `DeveloperProofSection`: one request ledger resolving into FinalReceipt.
- `ExpressiveBoundarySection`: parent, child, and work-order authority gates.
- Shared purple primary CTA, Deep Ink receipt, and chapter footer.

## State Matrix

| State | Visual | Meaning |
|---|---|---|
| Delegated | Purple transfer or path | work is moving under bounded authority |
| Reserved | Reserved Green | exposure is held open |
| PASS | Reserved Green text | committed evidence passed |
| Transaction | Deep Ink square | execution object |
| Reconciled | Deep Ink receipt + green status | final observed outcome |

Failure and uncertainty remain explicit text states in product surfaces; they
must never be implied through color alone.

## Motion and Reduced Motion

- Entry order: semantic sweep, MicroTransfer dock, copy rise, canvas reveal.
- Control: one `$5` signal follows the exact financial path.
- Proof: one progress rule completes before the receipt settles.
- Boundary: nested paths attenuate toward the reservation seam.
- No spring, bounce, particles, parallax, carousel, or unrelated infinite drift.
- Reduced motion shows the complete final state, removes the moving signal, and
  makes no information dependent on animation.

## Assets and Ownership

- Existing Mecharoon symbol, wordmark, Hero video, and poster remain unchanged.
- The hero video is self-hosted at `public/media/hero/mecharoon-money-flow.mp4`
  (2026-08-03; previously a third-party CloudFront URL).
- Lower chapters use native React, SVG, CSS, and `motion/react`; no generated
  image is shipped.

## Exact Copy and Typography

- Heading: Inter `700` tight-tracked via `next/font` (replaced the externally
  hosted `Helvetica Now Display Bold` on 2026-08-03 for licensing and
  durability; keep negative letter-spacing to preserve the display feel).
- Body: Inter via `next/font`.
- Technical labels: existing project mono stack.
- Current claims and the simulated-settlement disclaimer remain unchanged.

## Accessibility

- Semantic section order and heading hierarchy.
- Minimum 44px interactive targets.
- Text contrast survives without gradients or animation.
- `prefers-reduced-motion` produces the final state.
- Decorative diagrams are hidden from assistive technology; explanatory
  labels remain in surrounding copy.

## Real Data Replacements

`W-0187`, `R-0187`, `$15`, `$5`, `$10`, and `3 facts + citations` are explicit
illustrative fixtures. The live demo remains the source for actual sandbox
state.

## Implementation Order

1. Shared chapter shell and MicroTransfer.
2. Control Loop path and receipt.
3. Developer Proof ledger and collision-safe mobile layout.
4. Authority Boundary and transaction.
5. Reduced motion and responsive verification.

## Visual Verification

- 1440×900 desktop: all three chapters, no copy/canvas overlap.
- 390×844 mobile: no horizontal overflow; CTA, ledger, and receipt remain
  separate.
- Replay scrolling at normal speed and under reduced motion.
- Run lint, typecheck, tests, production build, and `git diff --check`.

## Residual Risks

- Display-font licensing and durability are outside this change.
- Marketing fixtures must not be presented as real transaction volume or live
  custody.
