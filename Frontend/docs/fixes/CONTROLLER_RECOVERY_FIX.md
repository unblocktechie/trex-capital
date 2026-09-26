# Controller recovery fix

This package fixes the token-creation recovery path that could reach the Platform Controller service without a controller address after the deployment transaction was already confirmed.

## Changes

- Treats a blank `VITE_TREX_PLATFORM_CONTROLLER_ADDRESS` as unset and falls back to the platform default; malformed non-empty controller values now fail during environment validation instead of later during token configuration.
- Carries `controllerAddress` in token issuance `supplyPricing` state and locks it with the payment token once creation starts.
- Normalizes an optional controller address from the payment-token catalogue and recognizes controller metadata nested in payment-token/deployment recovery records.
- Persists the controller when the issuer selects/saves a payment token. For a new deployment, the configured `VITE_TREX_PLATFORM_CONTROLLER_ADDRESS` remains the fallback controller.
- Uses one explicit deployment/recovery payment context in `DeploymentProcessingPage.jsx`, so price verification and price setup always receive the controller used for new platform deployments when the backend record has not been finalized yet.
- Aligns the Platform Controller documentation with the configured default address.
- Adds regression assertions for catalogue/controller normalization and locked creation state.

## Existing deployed token recovery

The fix does not deploy another token. After restarting the Vite app with this build, return to the existing deployment page and use **Retry transfer activation** / retry the configuration step. The existing deployment transaction hash is reused.

## Important

The configured Sepolia controller in this package remains:

`0x4052D80c222111234b89AFDfff597B5De8DA50cd`

Confirm this is the intended live controller for the environment before using the build.
