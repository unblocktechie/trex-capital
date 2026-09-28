# Investor purchase Platform Controller recovery fix

## Symptom

On the investor purchase page, both the live payment quote and **Allow payments** could fail with:

`Asset Platform Controller is unavailable. Refresh the page and try again.`

Refreshing did not help because the failure was caused by missing controller metadata in the mapped application/token response, not by transient browser state.

## Fix

The frontend now resolves the Platform Controller in this order:

1. Valid controller saved on the asset/application.
2. Controller returned by the authoritative selected-chain `paymentTokens` row for the asset's saved payment token.
3. The selected chain configuration's current Platform Controller for older records that predate controller persistence.

The payment-token address itself is still asset-authoritative and is not guessed from a symbol or legacy USDT field.

The interest/application mapper also preserves flattened `paymentTokenAddress`, `paymentTokenSymbol`, and controller aliases, and `paymentContextOf()` now inspects `interest.raw` and pricing records.

## After replacing the files

Stop and restart the Vite dev server, then hard-refresh the browser. Return to the same application purchase page. The page should be able to load the live quote and check/enable the payment permission without the missing-controller error.
