const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { env } = require('../src/core/config/env');
const { execute, withTransaction, closePool } = require('../src/database/connection');

const ISSUER_ROLE_UID = '00000000-0000-4000-8000-000000000003';
const INVESTOR_ROLE_UID = '00000000-0000-4000-8000-000000000004';
const DEFAULT_COUNT = 100;
const DEFAULT_PASSWORD = 'Abc@12345';

const positiveInteger = (value, fallback) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error('TEST_USER_COUNT must be an integer from 1 through 1000.');
  }
  return parsed;
};

const buildAccounts = (count, passwordHash) => {
  const accounts = [];
  for (let index = 1; index <= count; index += 1) {
    accounts.push({
      userUid: crypto.randomUUID(),
      roleUid: ISSUER_ROLE_UID,
      fullName: `Test Issuer ${index}`,
      email: `issuer${index}@mail.com`,
      passwordHash,
    });
    accounts.push({
      userUid: crypto.randomUUID(),
      roleUid: INVESTOR_ROLE_UID,
      fullName: `Test Investor ${index}`,
      email: `investor${index}@mail.com`,
      passwordHash,
    });
  }
  return accounts;
};

const seed = async () => {
  if (env.nodeEnv === 'production' && process.env.ALLOW_TEST_USER_SEED !== 'true') {
    throw new Error('Test-user seeding is disabled in production. Set ALLOW_TEST_USER_SEED=true only for an approved test environment.');
  }

  const count = positiveInteger(process.env.TEST_USER_COUNT, DEFAULT_COUNT);
  const password = process.env.TEST_USER_PASSWORD || DEFAULT_PASSWORD;
  if (password.length < 8) throw new Error('TEST_USER_PASSWORD must contain at least 8 characters.');

  const passwordHash = await bcrypt.hash(password, env.auth.bcryptRounds);
  const accounts = buildAccounts(count, passwordHash);

  await withTransaction(async (connection) => {
    const roles = await execute(
      `SELECT \`roleUid\` FROM \`userRole\`
       WHERE \`roleUid\` IN (?, ?) AND \`isActive\` = 1 AND \`isDeleted\` = 0`,
      [ISSUER_ROLE_UID, INVESTOR_ROLE_UID],
      connection,
    );
    if (roles.length !== 2) {
      throw new Error('Issuer and Investor roles must exist and be active before seeding test users.');
    }

    const placeholders = accounts.map(() => '(?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(3), 1, 0)').join(', ');
    const params = accounts.flatMap((account) => [
      account.userUid,
      account.roleUid,
      account.fullName,
      account.email,
      account.passwordHash,
    ]);
    await execute(
      `INSERT INTO \`userMaster\`
         (\`userUid\`, \`roleUid\`, \`fullName\`, \`email\`, \`passwordHash\`,
          \`emailVerified\`, \`emailVerifiedAt\`, \`isActive\`, \`isDeleted\`)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         \`roleUid\` = VALUES(\`roleUid\`),
         \`fullName\` = VALUES(\`fullName\`),
         \`passwordHash\` = VALUES(\`passwordHash\`),
         \`emailVerified\` = 1,
         \`emailVerifiedAt\` = COALESCE(\`emailVerifiedAt\`, UTC_TIMESTAMP(3)),
         \`isActive\` = 1,
         \`isDeleted\` = 0,
         \`updatedAt\` = UTC_TIMESTAMP(3)`,
      params,
      connection,
    );
  });

  console.log(`Test users ready: issuer1@mail.com through issuer${count}@mail.com`);
  console.log(`Test users ready: investor1@mail.com through investor${count}@mail.com`);
  console.log(`Shared password: ${password}`);
};

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
