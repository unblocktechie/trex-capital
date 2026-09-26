import { getAddress, isAddress } from 'viem';

const text = (value) => typeof value === 'string' ? value.trim() : '';
const address = (value) => isAddress(text(value), { strict: false }) ? getAddress(text(value).toLowerCase()) : '';

// The backend catalogue is authoritative. Never infer currency from a symbol,
// a legacy usdt* alias, or an environment-wide purchase/redemption address.
export const normalizePaymentTokens = (payload) => {
  const data = payload?.data ?? payload;
  const rows = Array.isArray(data) ? data : data?.paymentTokens || data?.items || [];
  const seen = new Set();
  return rows.map((item) => {
    const contractAddress = address(item.contractAddress || item.paymentTokenAddress);
    const chainId = Number(item.chainId ?? item.chain?.id ?? item.chain?.chainId);
    const decimals = Number(item.decimals);
    const symbol = text(item.symbol || item.paymentTokenSymbol);
    const key = `${chainId}:${contractAddress}`;
    if (!contractAddress || !symbol || !Number.isSafeInteger(chainId) || chainId <= 0
      || !Number.isInteger(decimals) || decimals < 0 || decimals > 36 || seen.has(key)) return null;
    seen.add(key);
    const controllerAddress = address(
      item.platformControllerAddress ||
        item.platformController ||
        item.controllerAddress ||
        item.controller?.contractAddress,
    );
    return {
      ...item, contractAddress, chainId, decimals, symbol, controllerAddress,
      name: text(item.name || item.displayName) || symbol,
      active: item.active === true || item.isActive === true,
      supportedActions: (Array.isArray(item.supportedActions) ? item.supportedActions : []).map((action) => String(action).toUpperCase()),
      explorerUrl: text(item.explorerUrl),
    };
  }).filter(Boolean);
};

export const supportsPaymentAction = (item, action) => {
  if (!item?.active) return false;
  const aliases = action === 'redeem' ? ['REDEEM', 'REDEMPTION'] : action === 'buy' ? ['BUY', 'PURCHASE', 'INVEST'] : ['CREATE', 'TOKEN_CREATION', 'BUY', 'PURCHASE', 'INVEST'];
  return item.supportedActions.some((value) => aliases.includes(value));
};

export const paymentContextOf = (...records) => {
  const sources = records
    .flatMap((record) => [
      record,
      record?.raw,
      record?.token,
      record?.tokenMaster,
      record?.tokenSummary,
      record?.tokenInvestment,
      record?.tokenDetails,
      record?.asset,
      record?.asset?.token,
      record?.assetSnapshot,
      record?.tokenSnapshot,
      record?.raw?.token,
      record?.interest,
      record?.interest?.raw,
      record?.tokenInformation,
      record?.information,
      record?.supplyPricing,
      record?.pricing,
      record?.paymentToken,
      record?.metadata,
      record?.deployment,
      record?.deployment?.metadata,
      record?.deploymentConfig,
      record?.settlement,
    ])
    .filter(Boolean);
  const first = (getter) => sources.map(getter).find(Boolean) || '';
  return {
    paymentTokenAddress: first((source) => address(source.paymentTokenAddress || source.paymentToken?.contractAddress || source.paymentToken?.address)),
    controllerAddress: first((source) => address(source.platformControllerAddress || source.platformController || source.controllerAddress || source.controller?.contractAddress)),
    paymentTokenSymbol: first((source) => text(source.paymentTokenSymbol || source.paymentToken?.symbol)),
  };
};
