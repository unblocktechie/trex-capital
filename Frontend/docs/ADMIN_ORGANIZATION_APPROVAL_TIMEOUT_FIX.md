# Admin organization approval timeout fix

## Problem

The admin organization decision screen could fail after 15 seconds with Axios
`timeout of 15000ms exceeded`, even though the intended application timeout was
500000 ms. The root `.env` and `.env.example` still overrode the 500000 ms
default from `src/config/env.js` with `VITE_REQUEST_TIMEOUT=15000`.

The page also displayed the same error twice because both React Query's global
mutation error handler and the page-level mutation handler emitted a toast.

## Fix

- Set `VITE_REQUEST_TIMEOUT=500000` in `.env` and `.env.example`.
- Keep `500000` as the central default request timeout.
- Give approve/reject organization decisions a minimum timeout of 500000 ms so
  a stale shorter environment value cannot reintroduce the 15 second failure.
- Mark the page-owned decision mutations as `silent` for global React Query
  error notifications, preventing duplicate toasts.
- Convert Axios timeout internals into a concise user-facing message.

No CSS, layout, responsive breakpoint, or organization decision payload was
changed.
