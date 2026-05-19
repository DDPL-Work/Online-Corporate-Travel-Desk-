# Centralized Online Reissue Migration

## Goal

Move all new flight reissue traffic to the centralized `/api/v1/reissue` module and retire the legacy duplicate flow under `/api/v1/flights/reissue`.

## Compatibility rules

- New employee traffic uses:
  - `POST /api/v1/reissue/search`
  - `POST /api/v1/reissue/:id/farequote`
  - `POST /api/v1/reissue/:id/confirm`
- Legacy compatibility endpoints remain temporarily:
  - `POST /api/v1/reissue/create`
  - `POST /api/v1/reissue/:id/quote`
- Legacy `/api/v1/flights/reissue` is no longer mounted as an active API surface.

## Data migration

1. Backfill any historic `FlightReissueRequest` rows into `ReissueRequest` using `utils/backfillLegacyReissues.util.js`.
2. Convert legacy in-flight ops statuses to terminal centralized statuses before editing those rows again:
   - `OPS_PENDING`, `OPS_ASSIGNED`, `OPS_PROCESSING`, `AWAITING_INTERNAL_SETTLEMENT` -> `FAILED`
   - `TICKET_UPLOADED` -> `COMPLETED`
3. Preserve legacy `amendment` and `amendmentHistory` on `BookingRequest` as compatibility mirrors only.
4. Treat `BookingRequest.servicing.reissue.*` as the source of truth for future servicing linkage.

## Rollout

1. Deploy backend changes first.
2. Deploy client and super-admin changes that call the centralized endpoints.
3. Verify:
   - Search creates a `ReissueRequest` and reaches `SEARCH_COMPLETED`
   - Fare quote reaches `BILLING_RESERVED`
   - Confirm reaches `COMPLETED`
   - Wallet / ledger reservations finalize correctly
4. Remove any remaining UI entry points that still call old amendment-style reissue paths.
