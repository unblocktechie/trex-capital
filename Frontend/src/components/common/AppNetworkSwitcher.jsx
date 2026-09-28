import { AlertTriangle, Check, ChevronDown, ExternalLink, Lock, Network, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ROUTES } from '@/config/routes';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useTokenIssuanceStore } from '@/store/tokenIssuance.store';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error';
import { getWalletErrorMessage } from '@/utils/wallet';
import { resolveMasterImageUrl } from '@/utils/masterImage';
import { buildTokenIssuanceNetworkMismatchMessage } from '@/utils/tokenIssuanceNetwork';

export function AppNetworkSwitcher({ pathname = '', onboardingOnly = false, network }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [switchingChainId, setSwitchingChainId] = useState(null);
  const wallet = useWalletConnection(network.activeChainId);
  const assetChainUid = useTokenIssuanceStore((state) => state.tokenInformation.chainUid);
  const assetNetworkNameFromForm = useTokenIssuanceStore((state) => state.tokenInformation.network);
  const activeChain = network.activeChain;
  const choices = network.selectableChains.length ? network.selectableChains : (network.activeChain ? [network.activeChain] : []);
  const deploymentNetworkPinned = pathname === ROUTES.tokenDeploying;
  const switcherDisabled =
    network.isNetworkLocked || network.isNetworkLockLoading || deploymentNetworkPinned;
  const isTokenIssuanceRoute =
    pathname.startsWith(`${ROUTES.createToken}/`) && pathname !== ROUTES.tokenDeploying;
  const assetTargetChain = isTokenIssuanceRoute && assetChainUid
    ? [...network.selectableChains, ...network.publicChains].find((chain) => chain.chainUid === assetChainUid) || null
    : null;
  const assetTargetNetworkName = assetTargetChain?.chainName || assetNetworkNameFromForm || 'the asset network';
  const assetNetworkNeedsSwitch = Boolean(
    isTokenIssuanceRoute &&
    assetChainUid &&
    network.activeChainUid &&
    assetChainUid !== network.activeChainUid &&
    !network.isNetworkLocked,
  );

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (switcherDisabled) setOpen(false);
  }, [switcherDisabled]);

  if (!activeChain || !network.hasEstablishedNetwork) return null;

  const activeImage = resolveMasterImageUrl(activeChain);
  const walletNeedsSwitch = Boolean(wallet.isConnected && wallet.chainId !== activeChain.chainId);
  const showAttentionDot = assetNetworkNeedsSwitch || walletNeedsSwitch;
  const mismatchMessage = buildTokenIssuanceNetworkMismatchMessage({
    assetNetworkName: assetTargetNetworkName,
    appNetworkName: activeChain.chainName,
  });
  const attentionTitle = assetNetworkNeedsSwitch
    ? mismatchMessage
    : walletNeedsSwitch
      ? `Wallet is not on ${activeChain.chainName}`
      : '';
  const choose = async (chain) => {
    if (!chain || switcherDisabled) return;

    const changesApplicationNetwork = chain.chainId !== activeChain.chainId;
    let applicationNetworkSelected = !changesApplicationNetwork;
    setSwitchingChainId(chain.chainId);
    try {
      if (changesApplicationNetwork) {
        const selected = await network.chooseChain(chain.chainId);
        if (!selected) return;
        applicationNetworkSelected = true;
      }
      setOpen(false);

      // Clicking the already-selected application network is also a valid retry
      // when the wallet itself is on another chain. This makes the navbar selector
      // double as the expected "switch wallet to selected network" control.
      if (!wallet.isConnected || wallet.chainId === chain.chainId) return;

      await wallet.switchChain(chain.chainId);
      toast.success(`Switched to ${chain.chainName}`, {
        description: 'The wallet and application network are now aligned.',
      });
    } catch (error) {
      const paymentRegistryUnavailable =
        error?.response?.status === 503 &&
        String(error?.response?.data?.code || error?.response?.data?.error?.code || '') ===
          'PAYMENT_TOKEN_REGISTRY_UNAVAILABLE';
      if (paymentRegistryUnavailable) {
        toast.warning(`${chain.chainName} is temporarily unavailable`, {
          description: 'Payment-token registry data could not be loaded. No local contract or token list was used.',
        });
      } else if (!applicationNetworkSelected) {
        toast.error(`Could not select ${chain.chainName}`, {
          description: getErrorMessage(error, 'The network configuration could not be loaded.'),
        });
      } else {
        toast.warning(`${chain.chainName} selected`, {
          description: `${getWalletErrorMessage(error)} Open the wallet control to retry the network switch.`,
        });
      }
    } finally {
      setSwitchingChainId(null);
    }
  };

  return (
    <div ref={rootRef} className="app-network-switcher relative min-w-0 shrink-0">
      <button
        type="button"
        className={cn(
          'flex min-h-10 max-w-[190px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-sm transition',
          'hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white sm:max-w-[230px] sm:px-3',
          open && 'border-slate-300 bg-slate-50',
        )}
        onClick={() => {
          if (!switcherDisabled) setOpen((value) => !value);
        }}
        disabled={switcherDisabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Application network: ${activeChain.chainName}${network.isNetworkLocked ? '; network locked after successful token creation' : ''}${deploymentNetworkPinned ? '; network temporarily pinned while token creation is in progress' : ''}${assetNetworkNeedsSwitch ? `; asset network ${assetTargetNetworkName} does not match the current application network` : ''}${walletNeedsSwitch ? '; wallet switch required' : ''}`}
        title={
          network.isNetworkLocked
            ? `${activeChain.chainName} is locked because this issuer created the token on this network.`
            : deploymentNetworkPinned
              ? `${activeChain.chainName} is temporarily pinned while the token creation transactions are being completed.`
              : network.isNetworkLockLoading
                ? 'Checking whether the issuer network is locked.'
                : assetNetworkNeedsSwitch
                  ? attentionTitle
                  : undefined
        }
      >
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
          {activeImage ? <img src={activeImage} alt="" className="size-full object-contain p-0.5" /> : <Network size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <small className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:block">
            {network.isNetworkLocked || deploymentNetworkPinned ? 'Network locked' : 'Network'}
          </small>
          <strong className="block truncate text-xs font-semibold text-slate-900 sm:text-[13px]">{activeChain.chainName}</strong>
        </span>
        {showAttentionDot ? (
          <span
            className="size-2 shrink-0 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]"
            title={attentionTitle}
            aria-hidden="true"
          />
        ) : null}
        {network.isNetworkLockLoading ? (
          <RefreshCcw className="shrink-0 animate-spin text-slate-400" size={14} />
        ) : network.isNetworkLocked || deploymentNetworkPinned ? (
          <Lock className="shrink-0 text-slate-400" size={14} aria-hidden="true" />
        ) : (
          <ChevronDown className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} size={15} />
        )}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-[1700] mt-2 w-[min(330px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.22)]"
          role="menu"
          aria-label="Switch application network"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <strong className="block text-sm font-semibold text-slate-950">Switch network</strong>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">Choose the network used by wallet-aware actions across the application.</span>
          </div>
          {assetNetworkNeedsSwitch ? (
            <div className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950" role="status">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={16} aria-hidden="true" />
              <div className="min-w-0">
                <strong className="block text-xs font-semibold">Network selections do not match</strong>
                <span className="mt-0.5 block text-xs leading-5 text-amber-800">
                  {mismatchMessage}
                </span>
              </div>
            </div>
          ) : null}
          <div className="max-h-[310px] overflow-y-auto p-1.5">
            {choices.map((chain) => {
              const image = resolveMasterImageUrl(chain);
              const selected = chain.chainId === activeChain.chainId;
              const switching = switchingChainId === chain.chainId;
              const requiredByAsset = assetNetworkNeedsSwitch && chain.chainUid === assetChainUid;
              return (
                <button
                  key={chain.chainUid}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
                    selected && 'bg-blue-50/80',
                    requiredByAsset && !selected && 'bg-amber-50/70',
                  )}
                  onClick={() => void choose(chain)}
                  disabled={Boolean(switchingChainId)}
                >
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-500">
                    {image ? <img src={image} alt="" className="size-full object-contain p-1" /> : <Network size={17} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <strong className="truncate text-sm font-semibold text-slate-950">{chain.chainName}</strong>
                      <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold', chain.isTestnet ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}>
                        {chain.isTestnet ? 'Testnet' : 'Mainnet'}
                      </span>
                    </span>
                    {requiredByAsset ? (
                      <small className="mt-0.5 block text-[11px] font-medium text-amber-700">Asset network in Step 1</small>
                    ) : wallet.isConnected && wallet.chainId !== chain.chainId && selected ? (
                      <small className="mt-0.5 block text-[11px] text-amber-700">Wallet switch required</small>
                    ) : null}
                  </span>
                  {switching ? <RefreshCcw className="animate-spin text-blue-600" size={16} /> : selected ? <Check className="text-blue-600" size={17} /> : null}
                </button>
              );
            })}
          </div>
          {!onboardingOnly ? (
            <div className="border-t border-slate-100 p-2">
              <Link
                to={ROUTES.chainAccess}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              >
                Manage network access <ExternalLink size={14} />
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
