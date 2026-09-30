# Chain-switch request optimization

The application treats the selected backend `chainUid` and a page's required/asset chain as separate concepts.

- Passing a `requiredChainId` to a wallet control no longer changes the selected application chain.
- Selecting a new application chain validates its public `/chains/{chainUid}/config`, cancels stale chain-scoped work, and updates the selected chain once.
- Chain switching does not broadly delete mounted React Query caches or invalidate `/chains/me`; chain-aware query keys activate the data required by the new chain naturally.
- Re-selecting the same chain is a no-op in the persisted network store.
- The header and its network switcher share one `useAppNetwork` instance.
- Automatic retries are disabled for HTTP 429 responses unless a caller explicitly opts in.
- On Review & Create, if the selected chain differs from the token's asset chain, token bootstrap, organization synchronization, and governance repair are paused. The page shows a single **Switch Chain** action instead.

This keeps stale requests from the previous chain from winning races while avoiding a refetch fan-out on every network selection.
