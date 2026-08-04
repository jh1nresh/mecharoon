import crypto from 'node:crypto';

import {
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} from '@circle-fin/developer-controlled-wallets';

const BLOCKCHAIN = 'ARC-TESTNET';

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) {
    fail(
      'CIRCLE_API_KEY is required. Create a testnet API key in the Circle ' +
        'developer console (console.circle.com), then rerun with the key ' +
        'exported. The key is never printed or stored by this script.',
    );
  }

  let entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
  let generatedEntitySecret = false;
  if (!entitySecret) {
    entitySecret = crypto.randomBytes(32).toString('hex');
    generatedEntitySecret = true;
    // Print before registering: if any later step crashes, the registered
    // secret must not die with this process.
    process.stdout.write(
      `CIRCLE_ENTITY_SECRET=${entitySecret}\n` +
        '# ^ SAVE THIS LINE TO .env.local NOW; registration happens next.\n',
    );
    try {
      await registerEntitySecretCiphertext({
        apiKey,
        entitySecret,
        recoveryFileDownloadPath: '.tmp',
      });
    } catch (error) {
      if ((error as {code?: number}).code === 156015) {
        fail(
          'This Circle account already has an entity secret registered ' +
            '(Circle stores only its hash, so it cannot be recovered from ' +
            'the console). Find the 32-byte hex you saved when you first ' +
            'configured developer-controlled wallets, set it as ' +
            'CIRCLE_ENTITY_SECRET in .env.local, and rerun. If it is lost, ' +
            'reset it in the console with your recovery file ' +
            '(console.circle.com -> Configurator -> Entity Secret).',
        );
      }
      throw error;
    }
  }

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  const walletSet = await client.createWalletSet({
    name: `mecharoon-arc-${Date.now()}`,
  });
  const walletSetId = walletSet.data?.walletSet?.id;
  if (!walletSetId) {
    fail('Circle returned no wallet set ID.');
  }

  const created = await client.createWallets({
    walletSetId,
    blockchains: [BLOCKCHAIN],
    count: 3,
    accountType: 'EOA',
  });
  const wallets = created.data?.wallets ?? [];
  if (wallets.length !== 3) {
    fail(`Expected 3 wallets, received ${wallets.length}.`);
  }
  const [buyer, provider, evaluator] = wallets;

  let faucetFailed = false;
  try {
    for (const wallet of wallets) {
      await client.requestTestnetTokens({
        address: wallet.address,
        blockchain: BLOCKCHAIN,
        usdc: true,
      });
    }
    // The buyer funds the $5 job and pays most of the gas; one extra drip.
    await client.requestTestnetTokens({
      address: buyer.address,
      blockchain: BLOCKCHAIN,
      usdc: true,
    });
  } catch {
    // Some API keys cannot use the faucet API; the console faucet page
    // works regardless, so wallet output below must still print.
    faucetFailed = true;
  }

  const lines = [
    '',
    'Provisioned three Circle developer-controlled EOA wallets on Arc',
    'Testnet.',
    ...(faucetFailed
      ? [
          'Faucet API returned an error (some keys cannot use it). Use the',
          'console Faucet page instead: Arc Testnet + USDC to each address',
          'below, with an extra drip for the buyer.',
        ]
      : ['Requested faucet USDC for each wallet.']),
    '',
    '# Append to .env.local (server-only values; never NEXT_PUBLIC_*):',
    'MECHAROON_SETTLEMENT_ADAPTER=arc_testnet_erc8183_v0',
    ...(generatedEntitySecret
      ? [
          `CIRCLE_ENTITY_SECRET=${entitySecret}`,
          '# ^ newly generated and registered; save it now. Losing it locks',
          '#   these wallets. A recovery file was written to .tmp/.',
        ]
      : []),
    `MECHAROON_ARC_BUYER_WALLET_ID=${buyer.id}`,
    `MECHAROON_ARC_BUYER_ADDRESS=${buyer.address}`,
    `MECHAROON_ARC_PROVIDER_WALLET_ID=${provider.id}`,
    `MECHAROON_ARC_PROVIDER_ADDRESS=${provider.address}`,
    `MECHAROON_ARC_EVALUATOR_WALLET_ID=${evaluator.id}`,
    `MECHAROON_ARC_EVALUATOR_ADDRESS=${evaluator.address}`,
    '# CIRCLE_API_KEY: export it yourself; it is intentionally not echoed.',
    '# MECHAROON_ARC_BUYER_ID / MECHAROON_ARC_SELLER_ID are set per run by',
    '# scripts/arc-live-run.ts.',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

void main();
