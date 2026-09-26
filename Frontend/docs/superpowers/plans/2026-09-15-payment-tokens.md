# Multi-payment frontend implementation plan

Goal: use the backend catalogue and each asset's stored payment token/controller for creation, pricing, investment and redemption.
Architecture: normalize API metadata once; carry an address-based payment context through existing wallet flows. Preserve backend confirmation payloads and recovery. The supplied Solidity/ABI remains unchanged; backend enforcement and migration are external prerequisites because backend source was not supplied.

- [x] Add catalogue API/normalization, strict decimal conversion, and payment-context tests (6/18 decimals, no currency inference from legacy aliases, missing configuration rejection).
- [x] Adapt controller service to new ABI, stored controller, selected ERC-20 metadata/balance/allowance, fixed PRICE_DECIMALS, and legacy controller reads with explicit verification. Preserve transaction receipt recovery.
- [x] Add creation dropdown using existing SelectField, send paymentTokenAddress, lock selections at token creation, preserve state/mapping, and format pricing using the bound symbol.
- [x] Thread payment context through purchase, redemption, issuer execution, price setup, and portfolio. Keep confirm requests limited to chainId/txHash/tokenUid/expectedAction.
- [x] Verify ABI encoding, quotes, allowance targeting, price precision, legacy routing, catalogue validation, initial application render, production build, and responsive creation UI. Package with integration notes and save the updated project.
