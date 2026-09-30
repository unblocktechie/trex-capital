# Token information payment field UI fix

## What changed

- The payment-token selector on **Asset Details** now uses the same 46px minimum control height as the adjacent starting-price input.
- The selected payment token uses a compact single-row presentation instead of stacking the symbol and token name.
- The required blockchain network is shown as a compact badge inside the selected payment-token control (for example, `Sepolia`).
- The dropdown option list itself keeps the existing richer two-line token presentation, so token identification remains clear.
- On screens at or below 420px, the secondary token name is hidden inside the selected value while the token symbol and network stay visible.

## Scope

The compact mode is enabled only on `TokenInformationPage`. Other uses of `PaymentTokenSelect` retain their existing layout and behavior.

No token selection, pricing, validation, wallet, network, API, or deployment logic was changed.
