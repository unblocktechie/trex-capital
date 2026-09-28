import { chainsApi } from '@/api/chains';
import { supportsPaymentAction } from '@/config/payment-tokens';
import { web3Config } from '@/config/web3';

const resolveChainUid = ({ chainUid, chainId }) => {
  if (chainUid && chainId) throw new Error('Use chainUid or chainId when loading payment tokens, not both.');
  const direct = String(chainUid || '').trim();
  if (direct) return direct;
  const record = web3Config.getChainRecordById(chainId);
  if (!record?.chainUid) throw new Error('The selected network is unavailable.');
  return record.chainUid;
};

export async function getPaymentTokens({ chainUid, chainId, action = 'purchase', signal } = {}) {
  const resolvedChainUid = resolveChainUid({ chainUid, chainId });
  const config = await chainsApi.getConfig(resolvedChainUid, { signal });
  return (config.paymentTokens || []).filter((item) =>
    !action || action === 'price' || supportsPaymentAction(item, action));
}

export async function requirePaymentToken({ paymentTokenAddress, chainUid, chainId, action }) {
  const rows = await getPaymentTokens({ chainUid, chainId, action });
  const item = rows.find((row) =>
    (!chainUid || row.chainUid === String(chainUid)) &&
    (!chainId || row.chainId === Number(chainId)) &&
    row.contractAddress.toLowerCase() === String(paymentTokenAddress || '').toLowerCase());
  if (!item || (action !== 'price' && !supportsPaymentAction(item, action))) {
    throw new Error('This asset’s payment token is unavailable for this action. Refresh or contact support.');
  }
  return item;
}
