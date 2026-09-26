import { apiClient } from '@/api/axios/axios.instance';
import { normalizePaymentTokens, supportsPaymentAction } from '@/config/payment-tokens';

export async function getPaymentTokens({ signal } = {}) {
  const response = await apiClient.get('/payment-tokens', { signal, skipGlobalLoader: true });
  return normalizePaymentTokens(response.data);
}

export async function requirePaymentToken({ paymentTokenAddress, chainId, action }) {
  const rows = await getPaymentTokens();
  const item = rows.find((row) => row.chainId === Number(chainId)
    && row.contractAddress.toLowerCase() === String(paymentTokenAddress || '').toLowerCase());
  if (!item || (action !== 'price' && !supportsPaymentAction(item, action))) {
    throw new Error('This asset’s payment token is unavailable for this action. Refresh or contact support.');
  }
  return item;
}
