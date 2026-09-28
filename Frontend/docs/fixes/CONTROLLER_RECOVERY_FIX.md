# Controller recovery fix

This package fixes the token-creation recovery path that could reach the Platform Controller service without a controller address after the deployment transaction was already confirmed.

## Changes

- Historically treated a blank frontend controller override as unset. The current implementation no longer accepts a frontend controller override; the selected-chain endpoint is authoritative.
- Carries `controllerAddress` in token issuance `supplyPricing` state and locks it with the payment token once creation starts.
- Normalizes an optional controller address from the payment-token catalogue and recognizes controller metadata nested in payment-token/deployment recovery records.
- Persists the controller when the issuer selects/saves a payment token. For a new deployment, the selected chain configuration provides the current Platform Controller.
- Uses one explicit deployment/recovery payment context in `DeploymentProcessingPage.jsx`, so price verification and price setup always receive the controller used for new platform deployments when the backend record has not been finalized yet.
- Aligns the Platform Controller documentation with the backend-selected controller.
- Adds regression assertions for catalogue/controller normalization and locked creation state.

## Existing deployed token recovery

The fix does not deploy another token. After restarting the Vite app with this build, return to the existing deployment page and use **Retry transfer activation** / retry the configuration step. The existing deployment transaction hash is reused.

## Important

The selected chain configuration is authoritative for the current Platform Controller. Do not restore a hardcoded controller or frontend environment fallback.
