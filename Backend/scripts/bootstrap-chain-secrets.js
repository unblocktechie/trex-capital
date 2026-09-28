const { execute, closePool } = require('../src/database/connection');
const { env, validateEnvironment } = require('../src/core/config/env');
const { encryptSecret } = require('../src/utils/secret-crypto');

const run = async () => {
  validateEnvironment();
  if (!env.blockchain.deployerPrivateKey) throw new Error('Legacy DEPLOYER_PRIVATE_KEY is required for the one-time bootstrap.');
  if (!env.chainSecrets.encryptionKey && env.nodeEnv === 'production') {
    throw new Error('CHAIN_SECRET_ENCRYPTION_KEY is required in production.');
  }
  const encrypted = encryptSecret(env.blockchain.deployerPrivateKey);
  const result = await execute(
    `UPDATE \`chainMaster\`
     SET \`deployerPrivateKeyEncrypted\` = ?, \`updatedAt\` = UTC_TIMESTAMP(3)
     WHERE \`chainId\` = ? AND \`isDeleted\` = 0`,
    [encrypted, env.blockchain.chainId],
  );
  if (!result.affectedRows) throw new Error(`No chainMaster row exists for chain ${env.blockchain.chainId}. Run the multi-chain migration first.`);
  process.stdout.write(`Encrypted signer bootstrap completed for chain ${env.blockchain.chainId}.\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}).finally(closePool);
