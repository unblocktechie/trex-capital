const { ethers } = require('ethers');

// Canonical payment-token catalogue. Add future currencies here instead of adding
// one environment variable per workflow. Contract state is still verified on-chain;
// these entries define which currencies the application is willing to expose/use.
const SUPPORTED_PAYMENT_TOKENS = Object.freeze([
  Object.freeze({
    paymentTokenCode: 'SEPOLIA_USDT',
    name: 'USDT',
    symbol: 'USDT',
    contractAddress: '0x86B14D29A59b745bF08c42661322d13142d5eb49',
    decimals: 6,
    chainId: 11155111,
    networkName: 'Sepolia',
    explorerUrl: 'https://sepolia.etherscan.io/token/0x86B14D29A59b745bF08c42661322d13142d5eb49',
    supportedActions: Object.freeze(['PURCHASE', 'REDEMPTION']),
    isActive: true,
  }),
  Object.freeze({
    paymentTokenCode: 'SEPOLIA_USDC',
    name: 'USDC',
    symbol: 'USDC',
    contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    chainId: 11155111,
    networkName: 'Sepolia',
    explorerUrl: 'https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    supportedActions: Object.freeze(['PURCHASE', 'REDEMPTION']),
    isActive: true,
  }),
]);

const LEGACY_PAYMENT_TOKEN_ADDRESS = SUPPORTED_PAYMENT_TOKENS[0].contractAddress;

const listSupportedPaymentTokens = (chainId = null, action = null) => SUPPORTED_PAYMENT_TOKENS
  .filter((token) => token.isActive)
  .filter((token) => chainId == null || Number(token.chainId) === Number(chainId))
  .filter((token) => !action || token.supportedActions.includes(String(action).toUpperCase()))
  .map((token) => ({ ...token, supportedActions: [...token.supportedActions] }));

const findSupportedPaymentToken = (contractAddress, chainId = null, action = null) => {
  if (!ethers.isAddress(contractAddress || '')) return null;
  return listSupportedPaymentTokens(chainId, action).find(
    (token) => token.contractAddress.toLowerCase() === String(contractAddress).toLowerCase(),
  ) || null;
};

module.exports = {
  SUPPORTED_PAYMENT_TOKENS,
  LEGACY_PAYMENT_TOKEN_ADDRESS,
  listSupportedPaymentTokens,
  findSupportedPaymentToken,
};
