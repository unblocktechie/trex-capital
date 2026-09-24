# Multi-payment-token flow

## Source of configuration

Supported payment currencies are defined in `src/config/payment-tokens.js`. Do not add separate
purchase/redemption address environment variables. Each entry contains display metadata, chain,
decimals, explorer URL, supported actions, and active state.

Current Sepolia currencies:

| Symbol | Contract address | Decimals |
| --- | --- | ---: |
| USDT | `0x86B14D29A59b745bF08c42661322d13142d5eb49` | 6 |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | 6 |

Use `GET /api/v1/payment-tokens` for the frontend dropdown. The same list is also included in
`GET /api/v1/token-options`.

## Token creation

The issuer selects one catalogue item and sends its `contractAddress` as `paymentTokenAddress` in
`PUT /api/v1/tokens/me/information`. The backend rejects unknown/inactive addresses and stores the
normalized address on `tokenMaster`. All later purchase and redemption calls for that security
token must use this stored payment token.

Existing tokens are migrated to the original USDT address and keep their existing Platform
Controller/Token Agent. New tokens use the currently configured Platform Controller.

## Frontend contract calls

Purchase:

```solidity
buy(tokenAddress, paymentTokenAddress, tokenAmountRaw)
```

The investor checks and, if necessary, approves allowance on `paymentTokenAddress` for the token's
stored Controller.

Redemption:

```solidity
redeem(investorWalletAddress, tokenAddress, paymentTokenAddress, tokenAmountRaw)
```

The issuer checks and, if necessary, approves allowance on `paymentTokenAddress` for the token's
stored Controller.

After either transaction is broadcast, call `POST /api/v1/investments/transactions/confirm` with
only the usual chain/hash/token/action context. Never submit payment amounts or payment addresses as
authoritative confirmation data.

## Backend verification and recovery

The verifier decodes the payment token from the new Controller calldata and requires it to match:

1. `tokenMaster.paymentTokenAddress`;
2. an active entry in the backend catalogue;
3. `PlatformController.isPaymentToken(paymentTokenAddress)` at the receipt block;
4. the payment-token `Transfer` event;
5. `TokensPurchased` or `TokensRedeemed` event data; and
6. the matching multi-payment `quoteBuy` or `quoteRedeem` result.

Canonical history stores generic `paymentToken*` and `paymentAmount*` fields. The older `usdt*`
fields remain populated as compatibility aliases and are not used to choose the currency.

The checkpointed indexer scans all configured payment-token addresses plus deployed token transfer
events. It calls the same verifier as the fast confirmation API, so missed frontend confirmations
are recovered idempotently. Existing legacy Controller signatures remain supported for already
deployed tokens.

## Deployment

Apply `database/migrations/20260908_add_multi_payment_tokens.sql` after the canonical blockchain
transaction migration. Back up production first. The migration is additive and backfills existing
tokens/history to the original USDT address.
