import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import usdcCoinIcon from '@/assets/icons/usdc-coin.svg';
import usdtCoinIcon from '@/assets/icons/usdt-coin.svg';
import { cn } from '@/utils/cn';

const sizeClasses = Object.freeze({
  xs: 'token-icon--xs',
  sm: 'token-icon--sm',
  md: 'token-icon--md',
  lg: 'token-icon--lg',
});

const normalizeSymbol = (value) => String(value || '').trim().toUpperCase();

export function TokenIcon({
  symbol,
  name,
  imageUrl = '',
  size = 'md',
  className,
  fallback = 'token',
  useBuiltInImages = true,
}) {
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const normalized = normalizeSymbol(symbol);
  const label = name || (normalized === 'USDC' ? 'USD Coin' : normalized === 'USDT' ? 'Tether USDt' : normalized || 'Token');
  const fallbackText = (normalized || label)
    .replace(/[^A-Z0-9]/gi, '')
    .slice(0, normalized.length > 2 ? 3 : 2)
    .toUpperCase() || 'T';
  const isUsdc = normalized === 'USDC';
  const isUsdt = normalized === 'USDT';
  const builtInImageUrl = useBuiltInImages ? (isUsdc ? usdcCoinIcon : isUsdt ? usdtCoinIcon : '') : '';
  const resolvedImageUrl = imageUrl || builtInImageUrl;
  const showImage = Boolean(resolvedImageUrl) && failedImageUrl !== resolvedImageUrl;
  const showCurrencyFallback = !showImage && fallback === 'currency';

  return (
    <span
      className={cn(
        'token-icon',
        sizeClasses[size] || sizeClasses.md,
        isUsdc && 'token-icon--usdc',
        isUsdt && 'token-icon--usdt',
        showImage && 'token-icon--image',
        showCurrencyFallback && 'token-icon--currency-fallback',
        className,
      )}
      role="img"
      aria-label={`${label} token`}
      title={`${label}${normalized && normalized !== label ? ` (${normalized})` : ''}`}
    >
      {showImage ? (
        <img src={resolvedImageUrl} alt="" onError={() => setFailedImageUrl(resolvedImageUrl)} />
      ) : showCurrencyFallback ? (
        <DollarSign aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{fallbackText}</span>
      )}
    </span>
  );
}

export default TokenIcon;
