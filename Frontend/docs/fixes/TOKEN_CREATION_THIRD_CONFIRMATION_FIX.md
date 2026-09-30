# Token creation: third confirmation and refresh recovery fix

## Why the third MetaMask confirmation did not open

`getPlatformTokenPrice()` successfully fetched the controller price into `rawPrice`, but returned an undefined variable named `priceRaw`. This threw `ReferenceError: priceRaw is not defined` before the processing page could call `setPrice`. The page caught that JavaScript error and displayed the generic “current price could not be verified” message shown in the screenshots. Retrying the same code could fail again even with successful RPC responses.

The refresh behavior had a separate routing problem: refreshing resets the in-memory deployment state to `idle`. The creation access guard could then redirect to token details if the backend already reported `deployed`, bypassing the processing page's remaining configuration checks. Seeing a created token after refresh did not itself prove the price transaction had completed.

## Changes

- `src/services/blockchain/trexPlatformController.service.js`: return `priceRaw: rawPrice`, preserving the existing return shape for all consumers.
- `src/components/token-issuance/TokenCreationAccessGuard.jsx`: allow the processing route to reconcile deployment state even immediately after refresh. Ordinary creation routes still redirect completed tokens to their details.
- `src/pages/tokens/DeploymentProcessingPage.jsx`: save the third transaction hash immediately after broadcast, before receipt polling. Retain it in recovery storage and the in-memory pending metadata even when a subsequent RPC error lacks a transaction hash.

The existing recovery logic checks live price before writing. It resumes receipt checks for a saved pending hash, requests a missing price transaction when needed, and finalizes the backend record after mandatory configuration is verified. It does not redeploy the token during price retry.

No CSS, page markup, payment-token configuration, contract addresses, chain settings, dependencies, or backend API payloads changed. Existing responsive layouts remain in place.

## Verification

43 automated tests pass: 35 existing regression tests and 8 deployment recovery tests. The new tests exercise the real page retry handler and price service with mocked blockchain, wallet and backend boundaries:

1. Missing third transaction is requested and backend finalization completes without refresh.
2. Already-confirmed price skips another wallet transaction.
3. Third transaction hash is persisted before receipt polling.
4. A pending third transaction blocks duplicate submission and premature finalization.
5. Refresh on the processing route reaches recovery even if the backend says deployed.
6. Completed tokens still redirect from ordinary creation steps.
7. A post-confirmation RPC failure preserves the third hash, and subsequent retry completes without another write.
8. Rejecting the third confirmation remains retryable and does not finalize the token.

Production build passes. ESLint reports zero errors in changed files, with one existing effect-dependency warning in DeploymentProcessingPage. Full-project lint remains blocked by pre-existing issues elsewhere; this is not a repository-wide lint cleanup.

Run with Node 22.22.1 or newer after `npm ci`:

```bash
node --import ./tests/controller-test-loader.mjs --test ./tests/controller-flow.test.mjs ./tests/regression.test.mjs ./tests/payment-tokens.test.mjs ./tests/payment-token-editing.test.mjs
node --import ./tests/deployment-test-loader.mjs --test ./tests/deployment-recovery.test.mjs
npm run build
```

## Apply and check locally

Use the updated frontend archive, or copy the three source files listed above into your existing frontend. Restart the development server. For the token already affected, reopen `/app/tokens/new/deploying` with the approved organization wallet connected on Sepolia. The flow checks the existing token and requests the missing price transaction only when needed.

No live wallet transaction was sent during this review. Verify once against your running backend and connected MetaMask: approve the first two steps, confirm the third prompt appears, approve it, and confirm completion without refreshing. Also check recovery after rejecting the third prompt or refreshing while its receipt is pending. Automated tests simulate those external boundaries; they do not replace a live integration check.
