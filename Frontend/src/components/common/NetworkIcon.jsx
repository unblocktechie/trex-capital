import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import arbitrumNetworkIcon from '@/assets/icons/arbitrum-network.svg';
import arcNetworkIcon from '@/assets/icons/arc-network.svg';
import ethereumNetworkIcon from '@/assets/icons/ethereum-network.svg';
import { cn } from '@/utils/cn';
import { resolveApiAssetUrl } from '@/utils/apiAssetUrl';

const clean = (value) => typeof value === 'string' ? value.trim() : '';
const firstText = (...values) => values.map(clean).find(Boolean) || '';

const localNetworkImage = ({ chainId, name = '' } = {}) => {
  const id = Number(chainId);
  const normalized = clean(name).toLowerCase();
  if (id === 11155111 || normalized.includes('ethereum') || normalized === 'sepolia') return ethereumNetworkIcon;
  if (id === 421614 || normalized.includes('arbitrum')) return arbitrumNetworkIcon;
  if (id === 5042002 || normalized.includes('arc')) return arcNetworkIcon;
  return '';
};

export const getBackendNetworkImageUrl = (chain = {}) => firstText(
  chain.imageUrl,
  chain.chainImageUrl,
  chain.chainLogoUrl,
  chain.networkImageUrl,
  chain.networkLogoUrl,
  chain.logoUrl,
  chain.iconUrl,
  typeof chain.logo === 'string' ? chain.logo : '',
  typeof chain.icon === 'string' ? chain.icon : '',
  chain.logo?.url,
  chain.logo?.imageUrl,
  chain.icon?.url,
  chain.icon?.imageUrl,
  chain.branding?.logoUrl,
  chain.branding?.imageUrl,
  chain.branding?.iconUrl,
  chain.metadata?.logoUrl,
  chain.metadata?.imageUrl,
  chain.metadata?.iconUrl,
  chain.metadata?.logo?.url,
  chain.metadata?.icon?.url,
);

export const getBackendNativeCurrencyImageUrl = (chain = {}) => firstText(
  chain.nativeCurrencyImageUrl,
  chain.nativeCurrencyLogoUrl,
  chain.nativeCurrencyIconUrl,
  chain.nativeTokenImageUrl,
  chain.nativeTokenLogoUrl,
  chain.nativeTokenIconUrl,
  chain.nativeCurrency?.imageUrl,
  chain.nativeCurrency?.logoUrl,
  chain.nativeCurrency?.iconUrl,
  chain.nativeCurrency?.logo?.url,
  chain.nativeCurrency?.icon?.url,
);

export function NetworkIcon({ chain, chainId, name, imageUrl = '', size = 'md', className }) {
  const [failedUrls, setFailedUrls] = useState([]);
  const normalizedChainId = Number(chainId ?? chain?.chainId ?? chain?.id);
  const networkName = firstText(name, chain?.chainName, chain?.networkName, chain?.name) || 'Network';
  const backendImageUrl = resolveApiAssetUrl(firstText(imageUrl, getBackendNetworkImageUrl(chain)));
  const localImageUrl = localNetworkImage({ chainId: normalizedChainId, name: networkName });
  const candidates = useMemo(
    () => [...new Set([backendImageUrl, localImageUrl].filter(Boolean))],
    [backendImageUrl, localImageUrl],
  );
  const resolvedImageUrl = candidates.find((candidate) => !failedUrls.includes(candidate)) || '';

  return (
    <span
      className={cn('network-icon', `network-icon--${size}`, resolvedImageUrl && 'network-icon--image', className)}
      role="img"
      aria-label={`${networkName} network`}
      title={networkName}
    >
      {resolvedImageUrl ? (
        <img
          src={resolvedImageUrl}
          alt=""
          onError={() => setFailedUrls((current) => current.includes(resolvedImageUrl) ? current : [...current, resolvedImageUrl])}
        />
      ) : (
        <Network aria-hidden="true" />
      )}
    </span>
  );
}

export default NetworkIcon;
