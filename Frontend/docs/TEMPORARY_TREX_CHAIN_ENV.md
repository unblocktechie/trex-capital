# Retired: frontend T-REX chain environment overrides

Chain-specific T-REX contract overrides are no longer supported in the frontend.
The backend is the source of truth for browser-safe runtime and contract configuration.

Use `GET /api/v1/chains` to discover active networks and
`GET /api/v1/chains/{chainUid}/config` for the selected network's contracts,
confirmations, RPC/explorer metadata, and payment-token catalogue.

Only generic browser configuration belongs in frontend environment variables.
