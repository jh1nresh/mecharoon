# Mecharoon Hardware Authority Wallet

## Product definition

> Mecharoon is an AI-native hardware authority wallet for autonomous actors.

An autonomous actor may be a person, organization, AI agent, robot, vehicle,
drone, industrial machine, or software service. The actor can hold a Mecharoon
root directly or receive an attenuated capability from another root.

The user-facing promise is:

> Delegate actions, not unrestricted keys.

The technical promise is:

> A hardware root of identity, authority, and proof for autonomous actors.

## Mecharoon is itself an agent

Mecharoon is not a passive key vault. It is a local authority and proof agent
backed by hardware-isolated keys. It interprets a requested action against a
bounded policy, authorizes an executor when the request is allowed, gathers
evidence, and emits a signed receipt.

```text
Task agent proposes an intent
-> Mecharoon resolves identity and effective policy
-> hardware root signs a bounded authorization
-> robot, service, or payment executor acts
-> Mecharoon binds evidence and external results
-> verifier confirms claims that require independent judgment
-> Mecharoon emits an append-only ActionReceipt
-> limits, routing, settlement, or reputation may change
```

Mecharoon may authorize and witness an action. It must not be the sole source
of truth for claims it cannot independently observe. High-risk outcomes use a
separate sensor, service, evaluator, quorum, TEE attestation, chain finality
proof, or human approval.

## Four roots

Do not collapse every kind of control into one owner key.

| Root | Question | May be held by |
| --- | --- | --- |
| Identity root | Who or what is this actor? | device, agent, organization |
| Authority root | What may it authorize or delegate? | agent, policy engine, multisig |
| Asset root | Which assets or resources may it control? | wallet, account, scoped executor |
| Governance root | Who can update, recover, revoke, or terminate it? | immutable constitution, agent, human, DAO, guardians |

An agent can hold the identity, authority, and asset roots itself. Governance
may also be agent-controlled, but its update and recovery rules must be
explicit and externally inspectable. Recommended controls include threshold
guardians, time locks, immutable ceilings, independent verification, and a
separate recovery key.

## Root models

### Human-rooted

```text
Human root
└── Mecharoon
    ├── personal assistant
    ├── payment child
    └── home robot
```

### Organization-rooted

```text
Company / DAO / multisig
└── Mecharoon fleet authority
    ├── warehouse robots
    ├── purchasing agents
    └── maintenance agents
```

### Agent-sovereign

```text
Mecharoon agent root
├── payment child
├── service child
├── robot child
└── experimental child
```

The agent-sovereign root can hold assets, earn revenue, buy services, delegate
work, and accumulate contextual reputation without a human approving every
action. Its constitutional limits and recovery path remain part of the receipt
and attestation model.

## Machine node model

Any machine with a provisioned Mecharoon can become a Mecharoon node. A node
has:

- a hardware-bound device and actor identity;
- an attested software and policy state;
- one or more scoped asset or resource executors;
- capability issuance and attenuation;
- signed action and settlement receipts;
- revocation, expiry, recovery, and governance rules.

Being a Mecharoon node does not automatically make the machine a blockchain
consensus validator. The node can validate and attest its own permitted actions
and can participate in an application-specific verifier network. Chain
validation is a separate role with its own staking, consensus, availability,
and slashing requirements.

## Product surfaces

- **Mecharoon Agent:** local policy, authorization, and evidence orchestration.
- **Mecharoon Core:** secure element, TPM, or TEE-backed identity and signer.
- **Mecharoon SDK:** capability, child-authority, executor, and receipt APIs.
- **Mecharoon Receipts:** portable action, payment, and verification records.
- **Mecharoon Network:** optional application-specific verification and
  settlement coordination; not required for the first device proof.

## First hardware proof

Do not start with custom silicon or a general robot economy. The first proof
should use an existing compute board plus a secure element or TPM and one
consequential action:

1. provision one hardware-bound identity;
2. install one immutable authority ceiling;
3. delegate one child capability;
4. approve one permitted action and reject one boundary violation;
5. bind device state, policy, executor result, and external evidence;
6. emit and independently verify one ActionReceipt;
7. demonstrate revocation or recovery.

The existing settlement MVP remains useful evidence for reservation,
idempotency, reconciliation, and receipt semantics. It is not evidence that the
hardware or machine-node layer has been built.
