# Token creation chain pinning fix

## Problem

Token creation uses three wallet transactions. Transaction 1 selected the token's configured chain, but the automatic call that started transaction 2 did not pass that chain id. The transfer activation helper then silently fell back to the application's default network. On a non-default network this stopped the sequential flow and exposed a manual Retry action. The retry path already supplied the configured chain id, which is why retry often succeeded.

The price transaction helper also accepted a silent default-chain fallback. Current callers normally supply a chain id, but that fallback could hide the same class of regression later.

## Fix

- Pin automatic transfer activation to `target.chain.id`, the same immutable chain used by transaction 1.
- Make T-REX deployment chain resolution fail closed when no valid chain id is supplied; it no longer falls back to `web3Config.requiredChain`.
- Reject conflicting token and deployment-configuration chain ids before any deployment wallet transaction is requested.
- Require an explicit chain id for the token-price write transaction instead of defaulting a write to the application default network.
- Add regression tests that guard these invariants.

## Production behavior

If chain context is missing or stale, the flow now stops before sending the affected wallet transaction and asks the user to refresh the token configuration. It will never intentionally switch a transaction to a different default chain as a fallback.
