# Registry registration retry handling

This frontend change separates temporary registry verification states from terminal transaction failures.

## Terminal failures

The following backend error codes now require a new wallet transaction:

- `TRANSACTION_FAILED`
- `INVALID_REGISTRY_CONTRACT`
- `UNAUTHORIZED_TRANSACTION_SENDER`
- `REGISTRY_PARAMETERS_MISMATCH`

For `TRANSACTION_FAILED`, the UI shows exactly:

> Registration transaction failed. Please retry the transaction.

The primary action becomes **Retry Registration**. The retry does not prepare a new registry operation. It reloads the existing operation and reuses its authoritative `registryOperationId`, `identityRegistryAddress`, `investorWalletAddress`, `onchainIdentityAddress`, `country`, and `chainId`.

Before MetaMask is opened, the frontend estimates gas for the exact `registerIdentity(...)` call and applies a 20% gas buffer. MetaMask then broadcasts a new transaction. The new transaction hash is posted to the existing confirmation endpoint for the same registry operation.

## Temporary verification states

The existing transaction is preserved and **Check Status** remains the action for temporary states such as:

- `TRANSACTION_NOT_FOUND`
- `INSUFFICIENT_CONFIRMATIONS`
- `RPC_UNAVAILABLE`
- `SYNCING`

Background recovery and polling never broadcast a replacement transaction. A replacement transaction can only be initiated by the issuer pressing **Retry Registration** for a terminal failure.

## Confirmation endpoint

The retry continues using the same endpoint and registry operation ID:

```text
POST /api/v1/investments/issuer/interests/:interestUid/registry-registration/:registryOperationId/confirm
```

with the newly broadcast `txHash`.
