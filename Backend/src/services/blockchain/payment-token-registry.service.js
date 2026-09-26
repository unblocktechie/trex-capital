const ethers = require('ethers');
const { env } = require('../../core/config/env');
const { ApiError } = require('../../core/errors/api-error');

const PLATFORM_CONTROLLER_PAYMENT_TOKEN_ABI = [
  'function paymentTokens() view returns (address[])',
];

class PaymentTokenRegistryService {
  constructor({ paymentTokenRepository, config = env.blockchain, dependencies = {} }) {
    this.paymentTokenRepository = paymentTokenRepository;
    this.config = config;
    this.providerFactory = dependencies.providerFactory
      || ((rpcUrl) => new ethers.JsonRpcProvider(rpcUrl));
    this.contractFactory = dependencies.contractFactory
      || ((address, provider) => new ethers.Contract(address, PLATFORM_CONTROLLER_PAYMENT_TOKEN_ABI, provider));
  }

  rpcUrls() {
    return [...new Set([
      this.config.sepoliaRpcUrl,
      ...(this.config.sepoliaFallbackRpcUrls || []),
    ].filter(Boolean))];
  }

  controllerAddress() {
    if (!ethers.isAddress(this.config.platformControllerAddress || '')) {
      throw new ApiError(
        503,
        'Platform Controller payment-token registry is not configured.',
        undefined,
        'PAYMENT_TOKEN_REGISTRY_NOT_CONFIGURED',
      );
    }
    return ethers.getAddress(this.config.platformControllerAddress);
  }

  async onChainAddresses(chainId) {
    const rpcUrls = this.rpcUrls();
    if (!rpcUrls.length) {
      throw new ApiError(503, 'Blockchain RPC is not configured.', undefined, 'RPC_UNAVAILABLE');
    }

    const expectedChainId = Number(chainId);
    const controllerAddress = this.controllerAddress();
    for (const rpcUrl of rpcUrls) {
      const provider = this.providerFactory(rpcUrl);
      try {
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== expectedChainId) continue;
        const controller = this.contractFactory(controllerAddress, provider);
        const addresses = await controller.paymentTokens();
        if (!Array.isArray(addresses) || addresses.some((address) => !ethers.isAddress(address))) {
          throw new Error('Platform Controller returned invalid payment-token data.');
        }
        return addresses.map((address) => ethers.getAddress(address));
      } catch {
        // Try the next configured RPC. An unverified DB-only fallback is intentionally forbidden.
      } finally {
        if (typeof provider.destroy === 'function') provider.destroy();
      }
    }

    throw new ApiError(
      503,
      'Supported payment tokens could not be verified against the Platform Controller.',
      undefined,
      'PAYMENT_TOKEN_REGISTRY_UNAVAILABLE',
    );
  }

  async listEnabled(chainId = this.config.chainId, action = null) {
    const [databaseTokens, onChainAddresses] = await Promise.all([
      this.paymentTokenRepository.listActive(chainId, action),
      this.onChainAddresses(chainId),
    ]);
    const enabledAddresses = new Set(onChainAddresses.map((address) => address.toLowerCase()));
    return databaseTokens.filter(
      (token) => enabledAddresses.has(token.contractAddress.toLowerCase()),
    );
  }
}

module.exports = { PaymentTokenRegistryService, PLATFORM_CONTROLLER_PAYMENT_TOKEN_ABI };
