import { useQuery } from '@tanstack/react-query';
import { getPaymentTokens } from '@/api/tokens/paymentTokens.api';

export function usePaymentTokens() {
  return useQuery({ queryKey: ['payment-tokens'], queryFn: ({ signal }) => getPaymentTokens({ signal }), staleTime: 30_000 });
}
