# Issuer redemption payment-token recovery fix

## Symptom

On the issuer redemption detail screen the readiness card could show:

`This asset’s payment token is unavailable for this action. Refresh or contact support.`

Refreshing did not fix it because some issuer-redemption detail responses do not carry the deployed asset's `paymentTokenAddress`. The blockchain redemption service correctly refuses to guess a payment token in a multi-payment-token setup, so the readiness check stopped before quoting the redemption.

## Fix

The issuer redemption flow now keeps the redemption response as the primary source and, only when its payment-token address is missing, recovers the payment context from authoritative token records:

1. The issuer's own token record (`/tokens/me`).
2. The token catalogue/detail record for the redemption's exact `tokenUid` as a compatibility fallback.

A recovered record is used only when its token UID (or, when necessary, its deployed token contract address) matches the redemption. The frontend never picks a payment token by symbol and never falls back to a global payment-token address.

`paymentContextOf()` also recognizes the token response shapes used by older APIs (`information`, `asset`, `tokenSummary`, `tokenInvestment`, snapshots, and settlement records), so the payment-token/controller metadata is preserved instead of being dropped by shape differences.

The same resolved context is then used consistently for:

- redemption readiness/quote checks;
- issuer payment-token allowance approval;
- final `redeem()` submission;
- observed transaction recovery; and
- readiness refresh after a failed submission.

## UI / responsive behavior

No stylesheet, layout, breakpoint, component class, or visual structure was changed. The existing issuer redemption design and responsive behavior remain intact; this patch changes only payment-context resolution and transaction inputs.
