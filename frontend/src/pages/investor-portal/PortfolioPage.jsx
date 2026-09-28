import { paymentContextOf } from '@/config/payment-tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Briefcase,
  Coins,
  Info,
  RefreshCcw,
  Search,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { portfolioAssetKey } from '@/utils/portfolioAssetKey';
import { CurrencyAmount } from '@/components/common/CurrencyAmount';
import { TokenPriceValue } from '@/components/common/TokenPriceValue';
import { InvestorHistoryPagination } from '@/components/investor-marketplace/InvestorHistoryPagination';
import { MarketplaceTokenImage } from '@/components/investor-marketplace/MarketplaceTokenImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/config/routes';
import { useDebounce } from '@/hooks/useDebounce';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInvestorProfileData } from '@/hooks/useInvestorProfileData';
import { investorPortfolioService } from '@/services/investor/investorPortfolioService';
import { getInvestorPurchaseTokenBalance } from '@/services/investor/investorTokenPurchaseTransaction.service';
import { getPlatformTokenPrice } from '@/services/blockchain/trexPlatformController.service';
import { getErrorMessage } from '@/utils/error';
import { resolveInitialTokenPriceExact } from '@/utils/tokenPrice';

const PAGE_SIZE = 20;

const exactDecimal = (value, maximumFractionDigits = 6) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '—';

  const match = normalized.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed)
      ? parsed.toLocaleString('en-US', { maximumFractionDigits })
      : '—';
  }

  const [, sign, integerPart, decimalPart = ''] = match;
  const grouped = integerPart.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
  const fraction = decimalPart.slice(0, maximumFractionDigits).replace(/0+$/, '');
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
};

const tokenAmount = (value, symbol) => `${exactDecimal(value, 8)} ${symbol || 'TOKEN'}`;
const settlementAmount = (value, maximumFractionDigits = 2) => exactDecimal(value, maximumFractionDigits);

const decimalParts = (value) => {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  const match = normalized.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const [, sign, integerPart, fraction = ''] = match;
  return {
    negative: sign === '-',
    digits: BigInt(`${integerPart}${fraction}` || '0'),
    scale: fraction.length,
  };
};

const pow10 = (value) => 10n ** BigInt(value);

const formatScaledDecimal = (signedValue, scale, maximumFractionDigits = 2) => {
  let value = signedValue;
  let resolvedScale = scale;

  if (resolvedScale > maximumFractionDigits) {
    const divisor = pow10(resolvedScale - maximumFractionDigits);
    const negative = value < 0n;
    const absolute = negative ? -value : value;
    const rounded = (absolute + (divisor / 2n)) / divisor;
    value = negative ? -rounded : rounded;
    resolvedScale = maximumFractionDigits;
  }

  if (resolvedScale < maximumFractionDigits) {
    value *= pow10(maximumFractionDigits - resolvedScale);
    resolvedScale = maximumFractionDigits;
  }

  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = pow10(resolvedScale);
  const whole = absolute / divisor;
  const fraction = resolvedScale ? String(absolute % divisor).padStart(resolvedScale, '0') : '';
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${resolvedScale ? `.${fraction}` : ''}`;
};

// Preserve every decimal place supplied by the API/on-chain calculation for financial
// summary values. This intentionally never converts through Number and never rounds.
const formatScaledDecimalExact = (signedValue, scale) => {
  const negative = signedValue < 0n;
  const absolute = negative ? -signedValue : signedValue;
  const divisor = pow10(scale);
  const whole = scale ? absolute / divisor : absolute;
  const rawFraction = scale ? String(absolute % divisor).padStart(scale, '0') : '';
  const fraction = rawFraction.replace(/0+$/, '');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
};

const sumDecimalValuesExact = (values) => {
  const parts = values.map(decimalParts).filter(Boolean);
  if (!parts.length) return null;
  const scale = Math.max(...parts.map((part) => part.scale));
  const total = parts.reduce((sum, part) => {
    const scaled = part.digits * pow10(scale - part.scale);
    return sum + (part.negative ? -scaled : scaled);
  }, 0n);
  return formatScaledDecimalExact(total, scale);
};

const multiplyDecimalValuesExact = (left, right) => {
  const leftParts = decimalParts(left);
  const rightParts = decimalParts(right);
  if (!leftParts || !rightParts) return null;
  const sign = leftParts.negative !== rightParts.negative ? -1n : 1n;
  const product = leftParts.digits * rightParts.digits * sign;
  return formatScaledDecimalExact(product, leftParts.scale + rightParts.scale);
};

const sumDecimalValues = (values, maximumFractionDigits = 2) => {
  const parts = values.map(decimalParts).filter(Boolean);
  if (!parts.length) return null;
  const scale = Math.max(...parts.map((part) => part.scale));
  const total = parts.reduce((sum, part) => {
    const scaled = part.digits * pow10(scale - part.scale);
    return sum + (part.negative ? -scaled : scaled);
  }, 0n);
  return formatScaledDecimal(total, scale, maximumFractionDigits);
};

const multiplyDecimalValues = (left, right, maximumFractionDigits = 2) => {
  const leftParts = decimalParts(left);
  const rightParts = decimalParts(right);
  if (!leftParts || !rightParts) return null;
  const sign = leftParts.negative !== rightParts.negative ? -1n : 1n;
  const product = leftParts.digits * rightParts.digits * sign;
  return formatScaledDecimal(product, leftParts.scale + rightParts.scale, maximumFractionDigits);
};

const validTokenDecimals = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 36 ? parsed : null;
};

const walletBalanceState = (status = 'loading', balance = '', reason = '') => ({ status, balance, reason });

function PortfolioLoading() {
  return (
    <Card className="investor-portfolio-list investor-portfolio-list--loading" aria-label="Loading portfolio">
      {[0, 1, 2, 3].map((row) => (
        <div className="investor-portfolio-row is-loading" key={row}>
          <span className="investor-portfolio-skeleton investor-portfolio-skeleton--logo" />
          <span className="investor-portfolio-skeleton investor-portfolio-skeleton--wide" />
          <span className="investor-portfolio-skeleton" />
          <span className="investor-portfolio-skeleton" />
        </div>
      ))}
    </Card>
  );
}

export default function PortfolioPage() {
  useDocumentTitle('Portfolio');
  const navigate = useNavigate();
  const investorProfileQuery = useInvestorProfileData();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [walletBalances, setWalletBalances] = useState({});
  const [platformPrices, setPlatformPrices] = useState({});
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  const registeredWalletAddress = String(
    investorProfileQuery.state?.wallet?.address
      || investorProfileQuery.rawInvestor?.walletAddress
      || investorProfileQuery.rawInvestor?.investor?.walletAddress
      || '',
  ).trim();

  const loadPortfolio = useCallback(async ({ quiet = false, signal } = {}) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setLoadError('');

    try {
      const result = await investorPortfolioService.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        signal,
      });
      if (signal?.aborted) return;
      setItems(result.items || []);
      setMeta(result.meta || { page, limit: PAGE_SIZE, total: result.items?.length || 0, totalPages: 1 });
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      setItems([]);
      setLoadError(getErrorMessage(error, 'Unable to load your portfolio right now.'));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    loadPortfolio({ signal: controller.signal });
    return () => controller.abort();
  }, [loadPortfolio]);

  useEffect(() => {
    if (page > meta.totalPages) setPage(Math.max(meta.totalPages, 1));
  }, [meta.totalPages, page]);

  useEffect(() => {
    const refreshVisibleBalances = () => setBalanceRefreshKey((value) => value + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshVisibleBalances();
    };

    window.addEventListener('focus', refreshVisibleBalances);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshVisibleBalances);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!items.length || loadError) {
      setWalletBalances({});
      setPlatformPrices({});
      return () => {
        active = false;
      };
    }

    setWalletBalances(Object.fromEntries(
      items.map((token) => [portfolioAssetKey(token), walletBalanceState('loading')]),
    ));
    setPlatformPrices(Object.fromEntries(
      items.map((token) => [portfolioAssetKey(token), { status: 'loading', value: '', reason: '' }]),
    ));

    if (investorProfileQuery.isLoading) {
      return () => {
        active = false;
      };
    }

    if (!registeredWalletAddress) {
      setWalletBalances(Object.fromEntries(
        items.map((token) => [portfolioAssetKey(token), walletBalanceState('unavailable', '', 'Registered wallet unavailable')]),
      ));
    } else {
      Promise.all(items.map(async (token) => {
        const tokenUid = portfolioAssetKey(token);
        const decimals = validTokenDecimals(token.decimals);
        if (!token.tokenAddress || !token.chainId || decimals === null) {
          return [tokenUid, walletBalanceState('unavailable', '', 'Token balance details unavailable')];
        }

        try {
          const rawBalance = await getInvestorPurchaseTokenBalance({
            tokenAddress: token.tokenAddress,
            investorWalletAddress: registeredWalletAddress,
            chainId: token.chainId,
          });
          return [tokenUid, walletBalanceState('ready', formatUnits(rawBalance, decimals))];
        } catch {
          return [tokenUid, walletBalanceState('unavailable', '', 'Current balance unavailable')];
        }
      })).then((entries) => {
        if (active) setWalletBalances(Object.fromEntries(entries));
      });
    }

    Promise.all(items.map(async (token) => {
      const tokenUid = portfolioAssetKey(token);
      if (!token.tokenAddress || !token.chainId) {
        return [tokenUid, { status: 'unavailable', value: '', reason: 'Current price unavailable' }];
      }
      try {
        const price = await getPlatformTokenPrice({ ...paymentContextOf(token), tokenAddress: token.tokenAddress, chainId: token.chainId });
        const value = String(price.currentTokenPrice || '').trim();
        if (!value || /^0(?:\.0+)?$/.test(value)) {
          return [tokenUid, { status: 'unavailable', value: '', reason: 'Current price is unavailable' }];
        }
        return [tokenUid, { status: 'ready', value, reason: '' }];
      } catch {
        return [tokenUid, { status: 'unavailable', value: '', reason: 'Live current price unavailable' }];
      }
    })).then((entries) => {
      if (active) setPlatformPrices(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [balanceRefreshKey, investorProfileQuery.isLoading, items, loadError, registeredWalletAddress]);

  const currentPage = Math.min(Math.max(meta.page || page, 1), Math.max(meta.totalPages || 1, 1));
  const start = meta.total ? ((currentPage - 1) * meta.limit) + 1 : 0;
  const end = meta.total ? Math.min(currentPage * meta.limit, meta.total) : 0;

  const overview = useMemo(() => {
    const investedValues = [];
    const currencies = new Map(items.map((item) => { const payment = paymentContextOf(item); return [`${item.chainId}:${payment.paymentTokenAddress}`, payment.paymentTokenSymbol || item.currency || '']; }));
    const singleCurrency = currencies.size === 1 && items.every((item) => paymentContextOf(item).paymentTokenAddress);
    const currency = singleCurrency ? [...currencies.values()][0] : '';
    const walletValues = [];
    let purchaseCount = 0;
    let verifiedBalances = 0;
    let pricedBalances = 0;

    items.forEach((token) => {
      const portfolio = token?.portfolio || {};
      if (decimalParts(portfolio.totalInvestedPaymentAmount)) investedValues.push(portfolio.totalInvestedPaymentAmount);
      purchaseCount += Number.isFinite(Number(portfolio.purchaseCount)) ? Number(portfolio.purchaseCount) : 0;

      const balanceState = walletBalances[portfolioAssetKey(token)];
      if (balanceState?.status === 'ready') {
        verifiedBalances += 1;
        const currentPrice = platformPrices[portfolioAssetKey(token)]?.status === 'ready'
          ? platformPrices[portfolioAssetKey(token)].value
          : '';
        const walletValue = multiplyDecimalValuesExact(balanceState.balance, currentPrice);
        if (walletValue !== null) {
          walletValues.push(walletValue);
          pricedBalances += 1;
        }
      }
    });

    return {
      totalInvested: singleCurrency ? sumDecimalValuesExact(investedValues) : null,
      currency,
      mixedCurrencies: !singleCurrency && items.length > 0,
      estimatedWalletValue: singleCurrency && pricedBalances === items.length && items.length
        ? sumDecimalValuesExact(walletValues)
        : null,
      purchaseCount,
      verifiedBalances,
      pricedBalances,
    };
  }, [items, platformPrices, walletBalances]);

  const summaryScope = meta.total > items.length ? 'shown on this page' : 'across your portfolio';
  const balanceLoading = items.some((token) => walletBalances[portfolioAssetKey(token)]?.status === 'loading' || platformPrices[portfolioAssetKey(token)]?.status === 'loading');

  const openManagement = (tokenUid) => {
    navigate(`${ROUTES.assetManagement}?tokenUid=${encodeURIComponent(tokenUid)}`);
  };

  const refreshPortfolio = () => {
    setBalanceRefreshKey((value) => value + 1);
    loadPortfolio({ quiet: true });
  };

  const estimatedCurrentValueLabel = overview.estimatedWalletValue === null
    ? ''
    : `${overview.estimatedWalletValue} ${overview.currency}`.trim();
  const totalInvestedLabel = overview.totalInvested === null
    ? ''
    : `${overview.totalInvested} ${overview.currency}`.trim();

  return (
    <div className="page-stack investor-portfolio-page">
      <header className="investor-portfolio-header">
        <div>
          <span className="eyebrow">Your token holdings</span>
          <h1>Portfolio</h1>
          <p>Review live balances in your registered wallet together with current token prices and completed investment totals.</p>
        </div>
        <Button
          variant="secondary"
          icon={RefreshCcw}
          loading={refreshing || balanceLoading}
          onClick={refreshPortfolio}
          className="investor-portfolio-refresh"
          aria-label="Refresh portfolio"
          title="Refresh portfolio"
        >
          Refresh
        </Button>
      </header>

      {!loading && loadError ? (
        <Card className="investor-portfolio-error" role="alert">
          <span className="investor-portfolio-error__icon"><ShieldCheck size={22} /></span>
          <div>
            <strong>Portfolio is temporarily unavailable</strong>
            <p>{loadError}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => loadPortfolio()}>Try again</Button>
        </Card>
      ) : null}

      <section className="investor-portfolio-summary" aria-label="Portfolio overview">
        <Card className="investor-portfolio-summary__card">
          <span className="investor-portfolio-summary__icon"><WalletCards size={20} /></span>
          <div>
            <span>Estimated current value</span>
            <strong
              className="investor-portfolio-summary__precise-amount"
              data-tooltip={!loading && estimatedCurrentValueLabel ? `Exact value: ${estimatedCurrentValueLabel}` : undefined}
              tabIndex={!loading && estimatedCurrentValueLabel ? 0 : undefined}
              aria-label={!loading && estimatedCurrentValueLabel ? `Estimated current value. Exact value ${estimatedCurrentValueLabel}` : undefined}
            >
              {loading || overview.estimatedWalletValue === null ? '—' : <CurrencyAmount symbol={overview.currency}>{overview.estimatedWalletValue}</CurrencyAmount>}
            </strong>
            <small>{loading ? 'Checking live balances' : `Live balance × current price, ${summaryScope}`}</small>
          </div>
        </Card>
        <Card className="investor-portfolio-summary__card">
          <span className="investor-portfolio-summary__icon"><Banknote size={20} /></span>
          <div>
            <span>Total invested</span>
            <strong
              className="investor-portfolio-summary__precise-amount"
              data-tooltip={!loading && totalInvestedLabel ? `Exact value: ${totalInvestedLabel}` : undefined}
              tabIndex={!loading && totalInvestedLabel ? 0 : undefined}
              aria-label={!loading && totalInvestedLabel ? `Total invested. Exact value ${totalInvestedLabel}` : undefined}
            >
              {loading || overview.totalInvested === null ? '—' : <CurrencyAmount symbol={overview.currency}>{overview.totalInvested}</CurrencyAmount>}
            </strong>
            <small>{overview.mixedCurrencies ? 'Different payment tokens; see individual asset amounts below.' : `Completed purchases ${summaryScope}`}</small>
          </div>
        </Card>
        <Card className="investor-portfolio-summary__card">
          <span className="investor-portfolio-summary__icon"><Briefcase size={20} /></span>
          <div>
            <span>Portfolio assets</span>
            <strong>{loading ? '—' : meta.total}</strong>
            <small>{loading ? 'Completed investment positions' : `${overview.verifiedBalances} of ${items.length} visible balance${items.length === 1 ? '' : 's'} verified`}</small>
          </div>
        </Card>
      </section>

      {!loading && !loadError && items.length ? (
        <div className="investor-portfolio-price-note" role="note">
          <Info size={17} />
          <div>
            <strong>Wallet balance is the source of truth for what you currently hold</strong>
            <span>Wallet balances and current prices are read live from the blockchain. Total invested and purchase counts include only completed purchases made through T-REX Capital Market. Direct wallet transfers can change your balance without changing that purchase history, so the page avoids performance estimates when the cost basis cannot be guaranteed.</span>
          </div>
        </div>
      ) : null}

      {loading ? (
        <PortfolioLoading />
      ) : !loadError && meta.total === 0 && !debouncedSearch ? (
        <Card className="investor-portfolio-empty">
          <span className="investor-portfolio-empty__icon"><Briefcase size={31} /></span>
          <h2>No completed investments yet</h2>
          <p>Your portfolio will show a token after your first purchase for that token reaches Completed. Pending, failed, and expired purchases are not included.</p>
          <Button icon={ArrowRight} onClick={() => navigate(ROUTES.marketplace)}>Explore Marketplace</Button>
        </Card>
      ) : !loadError ? (
        <>
          <Card className="investor-portfolio-toolbar">
            <label className="investor-portfolio-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value.slice(0, 100))}
                placeholder="Search token or issuer"
                aria-label="Search portfolio"
              />
            </label>
            <div className="investor-portfolio-toolbar__meta">
              <span><Coins size={15} /> Tokens with completed platform purchases</span>
              <small>Showing {start}{end > start ? `–${end}` : ''} of {meta.total} asset{meta.total === 1 ? '' : 's'}</small>
            </div>
          </Card>

          {items.length ? (
            <Card className="investor-portfolio-list">
              <div className="investor-portfolio-list__head" aria-hidden="true">
                <span>Asset</span>
                <span>Current balance</span>
                <span>Estimated value</span>
                <span>Current price</span>
                <span>Platform investment</span>
                <span>Action</span>
              </div>
              {items.map((token) => {
                const symbol = token?.symbol && token.symbol !== '—' ? token.symbol : 'TOKEN';
                const portfolio = token?.portfolio || {};
                const paymentSymbol = paymentContextOf(token).paymentTokenSymbol || token.currency || 'payment token';
                const balanceState = walletBalances[portfolioAssetKey(token)] || walletBalanceState('loading');
                const currentPriceState = platformPrices[portfolioAssetKey(token)] || { status: 'loading', value: '', reason: '' };
                const currentPrice = currentPriceState.status === 'ready' ? currentPriceState.value : '';
                const estimatedValue = balanceState.status === 'ready' && currentPriceState.status === 'ready'
                  ? multiplyDecimalValues(balanceState.balance, currentPrice, 2)
                  : null;

                return (
                  <article className="investor-portfolio-row" key={portfolioAssetKey(token)}>
                    <div className="investor-portfolio-asset">
                      <MarketplaceTokenImage token={token} size="sm" />
                      <div>
                        <strong>{token?.name || symbol}</strong>
                        <span>{[symbol, token?.issuer].filter((value) => value && value !== '—').join(' · ')}</span>
                        <small>Security token</small>
                      </div>
                    </div>

                    <div className="investor-portfolio-cell investor-portfolio-balance">
                      <span className="investor-portfolio-cell__label">Current balance</span>
                      <strong>
                        {balanceState.status === 'loading'
                          ? 'Checking…'
                          : balanceState.status === 'ready'
                            ? tokenAmount(balanceState.balance, symbol)
                            : 'Unavailable'}
                      </strong>
                      <small>{balanceState.status === 'ready' ? 'Live registered-wallet balance' : balanceState.reason || 'Refresh to check balance'}</small>
                    </div>

                    <div className="investor-portfolio-cell investor-portfolio-current-value">
                      <span className="investor-portfolio-cell__label">Estimated value</span>
                      <strong>{estimatedValue === null ? '—' : `${estimatedValue} ${paymentSymbol}`}</strong>
                      <small>{balanceState.status === 'ready' && currentPrice ? 'Current balance × live current price' : currentPriceState.reason || 'Available after live balance and price are verified'}</small>
                    </div>

                    <div className="investor-portfolio-cell investor-portfolio-token-price">
                      <span className="investor-portfolio-cell__label">Current price</span>
                      <strong>
                        {currentPriceState.status === 'loading'
                          ? 'Checking…'
                          : currentPrice
                            ? <TokenPriceValue value={currentPrice} suffix={` ${paymentSymbol}`} />
                            : 'Unavailable'}
                      </strong>
                      {currentPriceState.status === 'ready' ? null : (
                        <small>{currentPriceState.reason || 'Live price unavailable'}</small>
                      )}
                      <small>
                        Initial price{' '}
                        {resolveInitialTokenPriceExact(token)
                          ? <TokenPriceValue value={resolveInitialTokenPriceExact(token)} suffix={` ${paymentSymbol}`} />
                          : '—'}
                      </small>
                    </div>

                    <div className="investor-portfolio-cell investor-portfolio-investment">
                      <span className="investor-portfolio-cell__label">Platform investment</span>
                      <strong>
                        {`${settlementAmount(portfolio.totalInvestedPaymentAmount, 4)} ${paymentSymbol}`}
                      </strong>
                      <small>
                        Avg. purchase{' '}
                        {portfolio.averagePurchasePrice
                          ? <TokenPriceValue value={portfolio.averagePurchasePrice} suffix={` ${paymentSymbol}`} />
                          : '—'}
                      </small>
                    </div>

                    <div className="investor-portfolio-actions">
                      <Button
                        size="sm"
                        icon={Briefcase}
                        onClick={() => openManagement(token.tokenUid)}
                        disabled={!token.tokenUid}
                      >
                        Manage
                      </Button>
                      <button
                        type="button"
                        className="investor-portfolio-link"
                        onClick={() => navigate(ROUTES.marketplaceToken(token.tokenUid))}
                        disabled={!token.tokenUid}
                      >
                        View token <ArrowRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}

              {meta.totalPages > 1 ? (
                <div className="investor-portfolio-pagination">
                  <InvestorHistoryPagination
                    page={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={setPage}
                    disabled={refreshing}
                    itemLabel="portfolio assets"
                  />
                </div>
              ) : null}
            </Card>
          ) : (
            <Card className="investor-portfolio-empty investor-portfolio-empty--compact">
              <span className="investor-portfolio-empty__icon"><Coins size={28} /></span>
              <h2>No matching portfolio assets</h2>
              <p>Try another token name, symbol, or issuer.</p>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
