import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadNetworkConfig, parseNetworkArg } from './lib/network-config';

/**
 * One command to verify every contract for a chain: runs verify-chain.ts
 * (everything Hardhat's verify plugin can match directly), then — only on
 * networks with a custom, non-Etherscan explorer configured (explorerApiUrl
 * in networks.json, e.g. arc testnet's Blockscout instance) — the three
 * standalone fallback verifiers for the contracts verify-chain.ts can't
 * reach there (IdFactory, the oversized ModularCompliance/Token/
 * TREXImplementationAuthority contracts, and TREXFactory) — see each
 * script's own header comment for why it needs its own path. Networks with
 * a native Etherscan explorer (sepolia, mainnet, ...) don't need those
 * fallbacks — verify-chain.ts covers everything there, and the fallback
 * scripts would just fail (they require explorerApiUrl to be set).
 *
 * Usage: npm run verify:all -- --network <name>
 *
 * verify-chain.ts, verify-large-contracts.ts and verify-trexfactory.ts run
 * through `hardhat run --config hardhat.verify.config.ts`, which consumes
 * --network itself before the script ever sees argv — so this passes the
 * network along via the NETWORK env var too, same as those scripts'
 * package.json commands already require when run by hand.
 */

const FALLBACK_STEPS: { name: string; hardhat: boolean }[] = [
  { name: 'verify-idfactory.ts', hardhat: false },
  { name: 'verify-large-contracts.ts', hardhat: true },
  { name: 'verify-trexfactory.ts', hardhat: true },
];

function main() {
  const networkName = parseNetworkArg();

  // Validates the network is actually defined before running anything.
  loadNetworkConfig(networkName);

  const networksJsonPath = path.join(__dirname, '..', 'networks.json');
  const networksJson = JSON.parse(fs.readFileSync(networksJsonPath, 'utf8'));
  const needsFallbacks = Boolean(networksJson[networkName]?.explorerApiUrl);

  const steps = needsFallbacks ? [{ name: 'verify-chain.ts', hardhat: true }, ...FALLBACK_STEPS] : [{ name: 'verify-chain.ts', hardhat: true }];

  console.log(`=== Verifying chain "${networkName}" (${steps.length} steps) ===\n`);
  if (!needsFallbacks) {
    console.log(`(network "${networkName}" has no custom explorer configured — skipping the arc-style fallback verifiers, verify-chain.ts covers everything.)\n`);
  }

  const env = { ...process.env, NETWORK: networkName };

  for (const [index, step] of steps.entries()) {
    const scriptPath = path.join(__dirname, step.name);
    const command = step.hardhat
      ? `npx hardhat run "${scriptPath}" --config hardhat.verify.config.ts --network ${networkName}`
      : `npx ts-node "${scriptPath}" --network ${networkName}`;

    console.log(`\n--- Step ${index + 1}/${steps.length}: ${step.name} ---`);
    try {
      execSync(command, { stdio: 'inherit', env });
    } catch (error) {
      console.error(`\n=== Failed at step ${index + 1}/${steps.length}: ${step.name} ===`);
      console.error('Fix the issue above, then re-run that step by hand (and any remaining ones).');
      throw error;
    }
  }

  console.log(`\n=== Done — "${networkName}" fully verified ===`);
}

main();
