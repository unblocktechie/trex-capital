# Draft token review / create-button fix

This build fixes a false review blocker that can occur after refreshing a saved token draft.

## Root cause

The backend can authoritatively report that a token image is already saved (`backend.imageAvailable`) even when the browser cannot restore the image blob into `tokenInformation.logo`. The review validator previously required the in-memory logo object unconditionally, so `Asset details complete` became an error, `Technical setup ready` stayed `Waiting`, and the Create button remained disabled.

## Changes

- A backend-confirmed saved image now satisfies token-information validation.
- Backend step progression also preserves saved-image authority when the image blob/metadata is not returned after refresh.
- Review validation receives `backend.imageAvailable`.
- Editing a refreshed draft preserves the already-saved image when no replacement image is selected instead of forcing a second upload.
- Review checks include nonvisual reason metadata (title/ARIA) to make future blockers diagnosable without changing the visual layout.
- Existing deployment, wallet, network, claim, compliance, and agent validation remains enforced. The button is not force-enabled for incomplete drafts.
- No CSS or responsive-layout files were changed.

The token status may remain `draft` before deployment; that status alone is not a blocker.
