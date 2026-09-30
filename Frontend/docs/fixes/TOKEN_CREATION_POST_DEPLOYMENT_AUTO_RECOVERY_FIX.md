# Token creation post-deployment auto-recovery

## Problem

Token creation is a three-transaction flow. Transaction 1 could be confirmed correctly while transaction 2 (transfer activation) or transaction 3 (initial price) appeared to stop because a public RPC had not propagated the new receipt/state yet. Pressing **Retry** often succeeded because the chain had caught up by then. A navbar/network-context change during deployment could also make a later transaction target the wrong wallet network.

## Fix

- The deployment route now pins the application/wallet context to the asset's immutable deployment network and disables navbar network switching until creation finishes.
- The deployment network overrides a stale issuer network lock for the deployment screen so the navbar reflects the network actually being used by the asset setup.
- Transaction 2 is persisted immediately after broadcast. Receipt/state delays are reconciled by polling the authoritative `paused()` state before showing a manual recovery state. The existing hash is always checked before another `unpause` can be requested.
- Transfer-state reads now retry short-lived RPC failures automatically.
- Transaction 3 is also persisted immediately after broadcast. Receipt failures and stale token-price reads are reconciled against the live controller price before requiring user action.
- Recovery of an already-submitted price transaction performs multiple live-state checks and continues automatically once the configured price is visible.
- All post-deployment price operations use the asset's resolved deployment chain rather than a transient navbar/wallet React value.

## Safety / idempotency

The recovery logic never sends a duplicate transaction merely because a receipt RPC times out. A new transaction is only allowed when the earlier transaction is confirmed reverted or when no prior transaction hash exists and on-chain state still requires the action.

## User experience

During normal RPC propagation delays, the progress card stays in a **syncing / verifying automatically** state and continues to the next step as soon as the live contract state is correct. Manual Retry remains available only for genuinely unresolved or failed states.
