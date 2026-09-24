# Frontend updates

This package updates the supplied frontend without Privy and Arc. Existing Sepolia network configuration, USDT settlement, MetaMask/WalletConnect integration, email-link verification, and token-deployment service are retained. No Privy or Arc dependencies or runtime integration were added.

## Included changes

1. Beneficial owners must each hold more than 1.00%, with at most two decimal places. The total must be exactly 100.00%, with total indicators and review warnings.
2. Investment experience includes an exclusive None option, setting years to 0 and making the field read-only.
3. Both document-update requests and application rejection require an issuer note.
4. Completed rejection decisions show Rejected without unnecessary issuer attention flags.
5. Redemption cancellation is available only before issuer approval. A fresh, eligible server status is required; failed or missing status checks stop cancellation.
6. Country selection is optional. Continue is available when the country options list is empty. Both draft and final compliance payloads retain `countryRestrictionMode: "blocklist"` and `countryUids: []` when no country is selected. Selected country UIDs are retained normally. This overrides the earlier suggestion to omit empty country restrictions.
7. Completed purchases clear the amount, quote, and quote error.
8. Portfolio assets without a token UID remain visible when an address, symbol, or name is present. Display/cache keys keep these records separate, while actions needing a backend UID remain unavailable.
9. Purchase and redemption funding errors distinguish USDT shortages and Sepolia ETH network fees, with available/required amounts where known, wallet details, and funding instructions.
10. Platform contract addresses accept valid mixed-case input and normalize it before use.
11. HTTP 429 requests retry automatically, with bounded attempts and respect for Retry-After. Other HTTP errors are not automatically replayed by the interceptor.
12. Saved authentication state is loaded before the first render, removing the bootstrap loading screen.
13. Session-expired and account-not-found redirects use application navigation.
14. Page loaders are delayed; the global loader uses a minimum display time and non-blocking hidden state with transitions.
15. Sidebar workspace names handle long text and mobile overflow, with issuer-name fallback.
16. Portfolio cards, action placement, text wrapping, and Refresh adapt to mobile and tablet widths.
17. Portfolio investment precision and average purchase-price formatting are cleaned up, with repetitive purchase helper text removed.
18. Reusable currency amount/icon components improve price and summary alignment. USDT remains the existing payment asset.
19. Organization summary/overview registration-number displays are removed, and Registered address becomes Address. Registration-number collection and validation remain intact.
20. Empty issuer dashboards omit redundant asset-creation descriptions.
21. Final issuer approval actions and success messages are centered and sized for mobile.
22. Asset contract addresses and creation-confirmation links are in expandable technical details.
23. Get Help and Invite to Invest are hidden through the support feature flag. The retained Invite action opens Contact Us with application context.
24. Authentication, investment, redemption, and verification copy is simplified; Transaction History is labeled Activity History.
25. Investor review dates and organization incorporation dates use the shared date formatter.

## Verification

- `npm run build`: passed. Existing large-bundle advisory remains.
- `node --import ./tests/register-aliases.mjs --test ./tests/regression.test.mjs`: 11 tests passed.
- Baseline lint comparison: no new lint findings in changed source files. The original project has existing lint errors and warnings; full-project lint is not clean.
- Browser checks at 360, 768, and 1440 pixels: experience choices, beneficial-owner card, rejection dialog, funding dialog, portfolio, and country-compliance page rendered without horizontal document overflow or uncaught page errors.
- Browser interactions verified exclusive None selection, mandatory rejection notes, retention of two portfolio records without token UIDs, and empty country submission payloads.
- Browser checks verified the global loader under React StrictMode, its minimum display time and non-blocking hidden state, HTTP 429 recovery, no retries on HTTP 400, and balanced pending-request tracking.
- Code review checked the cancellation boundary and preserved Sepolia/authentication/payment integration.

Browser checks used local fixtures and mocked API responses. Live backend operations and wallet transactions were not executed. These checks cover the affected screens at representative device widths, not every device or full end-to-end deployment.

## Run locally

Use the existing environment configuration and normal project commands:

```sh
npm ci
npm run dev
```
