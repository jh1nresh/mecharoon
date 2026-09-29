import {createPool} from '../src/server/db/pool';
import {runGoldenDemo} from '../src/server/demo';

async function main(): Promise<void> {
  const pool = createPool();
  try {
    const result = await runGoldenDemo(pool);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await pool.end();
  }
}

void main();
