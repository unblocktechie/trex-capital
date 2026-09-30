# Redemption readiness UX fix

## What changed

The issuer redemption detail page now keeps the initial "Checking that this redemption is ready…" state visible for a minimum of 900 ms. The blockchain/API readiness call still starts immediately; only the visible state transition is smoothed when the response returns very quickly.

Repeated 7-second background readiness refreshes no longer force the action card back into the foreground loading state when the authoritative readiness inputs have not changed. This prevents the card from flashing between "Preparing redemption" and the next action while keeping the existing background refresh behavior.

If any authoritative input changes (redemption, chain, token contract, amount, payment token, or platform controller), the foreground readiness state is shown again for the new check.

The readiness message also uses `role="status"` and `aria-live="polite"` for non-visual status updates.

## Compatibility

No CSS, layout, breakpoint, wallet transaction, redemption transaction, API endpoint, or blockchain service behavior was changed. The existing responsive styles are untouched.
