export type TimelineItem = {
  step: number;
  code: string;
  status: string;
  detail: string;
};

export type Exposure = {
  limit_minor: string;
  reserved_minor: string;
  settled_minor: string;
  available_minor: string;
};

export type DemoResult = {
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

export type WalkthroughStep = TimelineItem & {
  authority: string;
  reserved: string;
  settlement: string;
  next_limit: string;
};

export const HOSTED_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    step: 1,
    code: 'DELEGATE',
    status: 'complete',
    detail: '$20 root authority is attenuated to a $15 child grant.',
    authority: '$20 root · $15 child',
    reserved: '$0',
    settlement: 'Not created',
    next_limit: '$5',
  },
  {
    step: 2,
    code: 'REPUTATION_GATE',
    status: 'denied',
    detail:
      '$8 is denied before any finalized receipt because the new seller cap is $5.',
    authority: '$20 root · $15 child',
    reserved: '$0',
    settlement: 'Not created',
    next_limit: '$5',
  },
  {
    step: 3,
    code: 'RESERVE',
    status: 'authorized',
    detail: '$5 is reserved atomically against both root and child authority.',
    authority: '$20 root · $15 child',
    reserved: '$5',
    settlement: 'Not created',
    next_limit: '$5',
  },
  {
    step: 4,
    code: 'EVALUATE',
    status: 'revise',
    detail:
      'The first artifact fails a required check. The budget remains reserved and no payment is instructed.',
    authority: '$20 root · $15 child',
    reserved: '$5',
    settlement: 'Blocked by REVISE',
    next_limit: '$5',
  },
  {
    step: 5,
    code: 'INSTRUCT',
    status: 'pass',
    detail:
      'The corrected artifact passes and creates one reservation-bound settlement instruction.',
    authority: '$20 root · $15 child',
    reserved: '$5',
    settlement: 'Instruction ready',
    next_limit: '$5',
  },
  {
    step: 6,
    code: 'QUARANTINE',
    status: 'unknown',
    detail:
      'An unknown adapter response keeps the full $5 reserved instead of making it spendable again.',
    authority: '$20 root · $15 child',
    reserved: '$5',
    settlement: 'Unknown · quarantined',
    next_limit: '$5',
  },
  {
    step: 7,
    code: 'RECONCILE',
    status: 'confirmed',
    detail:
      'Simulated finality is confirmed. Mecharoon creates the FinalReceipt and reputation event.',
    authority: '$20 root · $15 child',
    reserved: '$0',
    settlement: '$5 simulated confirmed',
    next_limit: '$10',
  },
  {
    step: 8,
    code: 'COMPOUND',
    status: 'authorized',
    detail:
      'The finalized receipt raises the contextual cap to $10, so the next $8 job is authorized.',
    authority: '$20 root · $15 child',
    reserved: '$0',
    settlement: '$5 simulated confirmed',
    next_limit: '$10 · $8 authorized',
  },
];

export const HOSTED_WALKTHROUGH_RESULT: DemoResult = {
  run_id: 'illustrative-run-001',
  mode: 'hosted_walkthrough',
  settlement_adapter: 'illustrative_noop_v0',
  real_funds: false,
  timeline: HOSTED_WALKTHROUGH_STEPS.map(
    ({step, code, status, detail}) => ({step, code, status, detail}),
  ),
  authority: {
    root: {
      limit_minor: '2000',
      final_exposure: {
        limit_minor: '2000',
        reserved_minor: '0',
        settled_minor: '500',
        available_minor: '1500',
      },
    },
    child: {
      limit_minor: '1500',
      exposure_while_unknown: {
        limit_minor: '1500',
        reserved_minor: '500',
        settled_minor: '0',
        available_minor: '1000',
      },
      final_exposure: {
        limit_minor: '1500',
        reserved_minor: '0',
        settled_minor: '500',
        available_minor: '1000',
      },
    },
  },
  receipt: {
    receipt_id: 'sample_receipt_not_signed',
    receipt_hash: 'sample_receipt_hash_not_signed',
    receipt: {
      work_order: {
        task_ref: 'sample://coding/verified-work-001',
        amount_minor: '500',
      },
      verdict: {outcome: 'pass', revision_count: 1},
      settlement: {
        tx_hash: 'sample_transaction_no_chain',
        finality: 'simulated_confirmed',
      },
    },
  },
  reputation: {
    before: {max_job_amount_minor: '500', route_code: 'new_seller_review'},
    after: {
      max_job_amount_minor: '1000',
      route_code: 'standard_verified',
      sample_size: 1,
    },
  },
  proofs: {
    illustrative_data_only: true,
    no_real_funds_moved: true,
    unknown_state_kept_full_reservation: true,
    no_receipt_before_reconciliation: true,
    reputation_waited_for_final_receipt: true,
    duplicate_payment_prevented: true,
  },
};
