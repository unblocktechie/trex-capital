# Multi-payment frontend integration

This integration supports the active networks returned by the backend. The supplied Solidity contract is unchanged. The frontend ABI is extracted from the supplied TREXPlatformController JSON artifact.

## Catalogue and asset identity

For the selected network, the frontend fetches `GET /api/v1/chains/{chainUid}/config` and uses only `data.paymentTokens`. `src/config/payment-tokens.js` normalizes those rows; it does not duplicate or merge a local currency catalogue.

Each row must provide `contractAddress`, `symbol`, `decimals`, `chainId` (or `chain.id`/`chain.chainId`), `active` (or `isActive`), and `supportedActions`. Optional `name`/`displayName` and `explorerUrl` are preserved. Supported action aliases include PURCHASE/BUY/INVEST and REDEMPTION/REDEEM. Inactive or unsupported entries cannot be used for transactions.

The frontend does not hardcode token addresses or assume a fixed token set for any network.

The issuer selects one catalogue entry beside the starting price. `PUT /api/v1/tokens/me/information` includes its address as `paymentTokenAddress`, together with the existing multipart information/image fields. The response must echo the stored address. Saved drafts remain editable, including after backend hydration. The selection locks at the existing creation/recovery boundary (when creation starts or a deployed asset is returned), matching the setup lifecycle. Numeric price changes after creation retain the currency.

Asset, application, portfolio, and issuer-redemption detail responses should expose the saved `paymentTokenAddress` and `platformControllerAddress`, preferably with `paymentTokenSymbol`. The mapper accepts nested `token`, `tokenMaster`, `raw`, `interest.raw`, `tokenInformation`, `supplyPricing`, pricing, or deployment records; controller aliases are `controllerAddress`, `platformController`, and `controller.contractAddress`. The payment-token address remains asset-authoritative and is never inferred from a symbol or legacy USDT alias. For older records that are missing only the controller, transaction services recover it from the matching authoritative selected-chain payment-token row, and only then from the selected chain configuration's current Platform Controller. This keeps refresh/recovery flows usable without changing the asset's selected payment token. Legacy `usdt*` history fields are display compatibility aliases only.

## Transactions

For an existing asset, use its stored controller. New deployments use the Platform Controller returned by the selected-chain configuration. No purchase/redemption payment or controller address is sourced from frontend environment variables.

Investment: select asset → enter asset quantity → load its fixed currency → validate catalogue, chain, controller, asset configuration, on-chain currency metadata and whitelist → obtain `quoteBuy(asset, paymentToken, assetAmountRaw)` → check investor payment balance, allowance, and native fee balance → approve that ERC-20 for the saved controller if necessary → simulate and broadcast `buy(asset, paymentToken, assetAmountRaw)` from the investor wallet.

Redemption: investor enters quantity and submits the existing redemption request → issuer reviews → load the asset's fixed currency → obtain `quoteRedeem(asset, paymentToken, assetAmountRaw)` → check issuer payment balance and allowance → issuer approves that ERC-20 for the saved controller if necessary → validate investor asset balance and issuer wallet → simulate and broadcast `redeem(investor, asset, paymentToken, assetAmountRaw)` from the issuer wallet. No investor asset-token approval is introduced; the existing Token Agent burns the asset.

The existing explicit maximum-allowance approval flow is retained. A nonzero allowance is reset to zero before granting maximum allowance, without branching on a currency symbol. Transactions are requoted before execution and reject a changed expected payment amount. Simulation remains the final pre-broadcast contract check. Native-fee prechecks reject a zero native balance; they do not guarantee that a nonzero balance covers all eventual gas costs.

Legacy controllers are detected using the missing PRICE_DECIMALS interface, then validated against their `paymentToken()` getter. Their original buy/redeem and quote signatures are retained. Ordinary RPC failures are not interpreted as evidence of a legacy controller.

## Precision and ABI

Asset quantities use the asset's decimals. ERC-20 balance, allowance, and payment amounts use the catalogue decimals, verified against `decimals()`; `symbol()` is also checked. New-controller prices use `PRICE_DECIMALS` (6 in the supplied contract), independently of payment-token decimals. `setPrice(asset, priceRaw)` retains its original signature. Input exceeding the allowed precision is rejected before `parseUnits`; transaction arithmetic uses BigInt.

The supplied contract quotes with two integer divisions, preserving its rounding order:

```text
normalized = floor(assetAmountRaw * priceRaw / 10^assetDecimals)
paymentRaw = floor(normalized * 10^paymentDecimals / 10^priceDecimals)
```

The frontend uses the on-chain quote as the transaction amount source and displays its exact formatted payment amount. It does not replace that result with floating-point price multiplication. This handles both 6- and 18-decimal catalogue currencies. Portfolio totals are withheld across mixed payment currencies rather than assuming an exchange rate.

`src/abi/TREXPlatformController.json` contains the supplied ABI, including the new quote/buy/redeem signatures and TokensPurchased/TokensRedeemed events. The frontend does not assert canonical settlement from event parsing; the backend verifier remains authoritative.

## Confirmation and backend prerequisites

After broadcast, the existing recovery/confirmation flow submits only `chainId`, `txHash`, `tokenUid`, and `expectedAction` to `POST /api/v1/investments/transactions/confirm`. Payment addresses and amounts are not authoritative confirmation inputs. Local observed-transaction records may retain currency/controller metadata for display and recovery.

Backend source and database access were not supplied, so this frontend delivery does not implement or apply the backend migration, verifier, or checkpointed indexer. Before deployment, the backend must:

1. Expose selected-chain `paymentTokens`, validate creation addresses, persist the chosen payment token, allow changing it while the asset is a draft, and reject currency changes once creation starts.
2. Return each asset's stored controller and currency in all transaction-facing responses.
3. Verify calldata, stored currency, active catalogue, receipt-block whitelist, payment Transfer, Controller purchase/redemption event, and matching multi-payment quote.
4. Persist generic paymentToken*/paymentAmount* canonical history fields and compatibility aliases; index all configured currencies and deployed asset transfers using the same idempotent verifier.
5. Back up production, then apply `database/migrations/20260908_add_multi_payment_tokens.sql` after the canonical blockchain migration. Backfill legacy assets to the original USDT address while preserving their existing controllers and Token Agents.

The supplied Controller globally whitelists payment tokens; it does not itself make a per-asset currency immutable. This frontend lock and backend verification do not add an on-chain immutable currency mapping or prevent direct calls outside the application.

## Validation

Run from the project root with the configured Node version:

```sh
node --import ./tests/register-aliases.mjs --test ./tests/regression.test.mjs ./tests/payment-tokens.test.mjs
node --import ./tests/controller-test-loader.mjs --test ./tests/controller-flow.test.mjs
npm run build
```

The transaction tests mock RPC, wallet, and API boundaries while exercising the real service and ABI encoding. They cover 6/18 decimals, controller targeting, issuer redemption, legacy routing, price precision, allowance resets, changed quotes, and confirmation payloads. Browser checks exercised the actual creation component at 360, 768, and 1440 px, including repeated draft saves, draft reload, creation-time currency lock, editable price, and horizontal overflow; the normal login route rendered without JavaScript errors. Live wallet transactions and backend settlement were not tested.

## Draft currency correction

Payment selection is no longer locked by an initial information save or the mere existence of `paymentTokenAddress`. The backend information endpoint must likewise allow payment-token changes for draft assets; an API that locks immediately on the first save must be updated in the backend project. Existing creation-in-progress recovery locks are preserved. If signing is cancelled before broadcast and the existing flow restores an editable draft, the currency becomes editable again; no token has been created at that point. The dropdown and selected value show the currency icon, symbol, and name using the existing keyboard-accessible select.

Additional lifecycle regression test:

```sh
node --import ./tests/controller-test-loader.mjs --test ./tests/payment-token-editing.test.mjs
```
