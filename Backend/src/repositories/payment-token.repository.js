const ethers = require('ethers');
const { execute } = require('../database/connection');

const present = (row) => {
  if (!row) return null;
  const supportedActions = [];
  if (row.supportsPurchase) supportedActions.push('PURCHASE');
  if (row.supportsRedemption) supportedActions.push('REDEMPTION');
  return {
    paymentTokenUid: row.paymentTokenUid,
    paymentTokenCode: row.paymentTokenCode,
    name: row.paymentTokenName,
    symbol: row.paymentTokenSymbol,
    contractAddress: ethers.getAddress(row.contractAddress),
    decimals: Number(row.decimals),
    chainId: Number(row.chainId),
    networkName: row.networkName,
    explorerUrl: row.explorerUrl,
    supportedActions,
    isDefault: Boolean(row.isDefault),
    displayOrder: Number(row.displayOrder || 0),
    isActive: Boolean(row.isActive),
  };
};

const actionClause = (action) => {
  const normalized = action ? String(action).toUpperCase() : null;
  if (normalized === 'PURCHASE') return ' AND `supportsPurchase` = 1';
  if (normalized === 'REDEMPTION') return ' AND `supportsRedemption` = 1';
  return '';
};

class PaymentTokenRepository {
  async listActive(chainId = null, action = null, executor) {
    const params = [];
    let chainClause = '';
    if (chainId !== null && chainId !== undefined) {
      chainClause = ' AND `chainId` = ?';
      params.push(Number(chainId));
    }
    const rows = await execute(
      `SELECT *
       FROM \`paymentTokenMaster\`
       WHERE \`isActive\` = 1 AND \`isDeleted\` = 0
         ${chainClause}${actionClause(action)}
       ORDER BY \`isDefault\` DESC, \`displayOrder\`, \`paymentTokenName\``,
      params,
      executor,
    );
    return rows.map(present);
  }

  async findActiveByAddress(contractAddress, chainId = null, action = null, executor) {
    if (!ethers.isAddress(contractAddress || '')) return null;
    const params = [String(contractAddress).toLowerCase()];
    let chainClause = '';
    if (chainId !== null && chainId !== undefined) {
      chainClause = ' AND `chainId` = ?';
      params.push(Number(chainId));
    }
    const rows = await execute(
      `SELECT *
       FROM \`paymentTokenMaster\`
       WHERE LOWER(\`contractAddress\`) = ?
         AND \`isActive\` = 1 AND \`isDeleted\` = 0
         ${chainClause}${actionClause(action)}
       LIMIT 1`,
      params,
      executor,
    );
    return present(rows[0]);
  }

  async findDefault(chainId, action = null, executor) {
    const rows = await execute(
      `SELECT *
       FROM \`paymentTokenMaster\`
       WHERE \`chainId\` = ? AND \`isDefault\` = 1
         AND \`isActive\` = 1 AND \`isDeleted\` = 0
         ${actionClause(action)}
       ORDER BY \`displayOrder\`, \`paymentTokenName\`
       LIMIT 1`,
      [Number(chainId)],
      executor,
    );
    return present(rows[0]);
  }
}

module.exports = { PaymentTokenRepository, presentPaymentToken: present };
