# Investor token transfer error UX fix

## Problem

Wallet simulation failures from `viem` were displayed directly in the Manage Investments send flow. A contract revert such as `Transfer not possible` therefore exposed addresses, function arguments, documentation URLs, and library version details in both the status card and toast.

## Fix

- Added `getInvestorTokenTransferErrorMessage()` to the investor transfer transaction service.
- Maps known transfer failures to concise, actionable investor-facing messages.
- The ERC-3643/T-REX `Transfer not possible` revert now explains that the token's current transfer rules do not allow the transfer and asks the investor to verify recipient approval/eligibility.
- Handles common wallet conditions such as a pending MetaMask request, insufficient Sepolia ETH for network fees, paused/restricted transfers, insufficient token balance, RPC/network issues, and recent-transaction nonce states.
- Keeps existing application-authored messages (wrong wallet, wrong network, invalid recipient) intact.
- Falls back to a short generic message rather than ever exposing raw wallet/viem diagnostics.

## UI / responsive impact

No CSS, layout, breakpoints, sizing, or responsive styles were changed. The existing status card and toast components are reused; only their error copy is sanitized.
