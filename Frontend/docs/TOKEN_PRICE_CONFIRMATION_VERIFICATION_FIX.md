# Token price confirmation verification fix

## Problem

A newly deployed token could reach **Token created — price confirmation needs attention** even when the Platform Controller `setPrice(token, newPrice)` transaction itself was valid and the controller did not report a revert.

The deployment page first calls `getPlatformTokenPrice()` to determine whether a price transaction is needed. That read path reused `paymentTokenMetadata()`, which requires the backend `/payment-tokens` catalogue and a saved `paymentTokenAddress`. During token finalization those backend/payment-token fields can still be incomplete even though reading `tokenPrice(token)` only requires the Platform Controller and token contract. The frontend therefore converted a non-price metadata failure into the generic “current price could not be verified” deployment error.

There was also a small race after a successful `setPrice` receipt: an immediate `tokenPrice` read using a load-balanced RPC could be served by a replica that was briefly behind the receipt-serving replica.

## Fix

- Price read/write operations now resolve price precision directly from the Platform Controller (`PRICE_DECIMALS`) and do not require the payment-token catalogue when the controller address is already known.
- Older records that lack a controller can still use the payment-token catalogue as a compatibility fallback.
- Legacy controllers recover their authoritative `paymentToken()` directly on-chain and use that token's decimals.
- After `setPrice` confirms, verification prefers the exact receipt block. If that block is temporarily unavailable from an RPC replica, the frontend briefly retries the latest state before showing a recovery state.
- Ordinary price reads also retry short-lived RPC read failures.
- Purchase and redemption flows remain unchanged and still enforce the payment-token catalogue strictly.

## Safety / UX

The fix does not bypass transaction simulation, receipt status checks, configured-price comparison, issuer wallet checks, or duplicate-transaction protection. If the live controller price already equals the configured price, retrying the deployment status completes the price step without sending another wallet transaction.

No CSS, responsive breakpoints, layout, or visual component behavior was changed.
