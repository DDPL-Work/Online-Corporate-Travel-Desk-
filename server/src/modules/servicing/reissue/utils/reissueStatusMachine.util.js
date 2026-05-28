const ApiError = require("../../../../utils/ApiError");
const { REISSUE_STATUSES, OFFLINE_STATUSES } = require("../constants/reissue.constants");

// ── Online reissue status transitions ──
const ALLOWED_TRANSITIONS = Object.freeze({
  [REISSUE_STATUSES.CREATED]: [REISSUE_STATUSES.ELIGIBILITY_CHECKED],
  [REISSUE_STATUSES.ELIGIBILITY_CHECKED]: [
    REISSUE_STATUSES.SEARCH_COMPLETED,
    REISSUE_STATUSES.OFFLINE_REQUIRED,   // ← provider rejection / sandbox fallback
    REISSUE_STATUSES.OPS_PENDING,
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.SEARCH_COMPLETED]: [
    REISSUE_STATUSES.QUOTE_RECEIVED,
    REISSUE_STATUSES.OFFLINE_REQUIRED,   // ← fare-rule driven offline routing
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.QUOTE_RECEIVED]: [
    REISSUE_STATUSES.BILLING_RESERVED,
    REISSUE_STATUSES.CANCELLED,
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.BILLING_RESERVED]: [
    REISSUE_STATUSES.PROCESSING,
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.PROCESSING]: [
    REISSUE_STATUSES.COMPLETED,
    REISSUE_STATUSES.FAILED,
    REISSUE_STATUSES.AWAITING_INTERNAL_SETTLEMENT,
  ],
  // ── OFFLINE_REQUIRED is a soft terminal state ──
  // The request stays open so an offline request can be raised against it.
  // Only FAILED is allowed from here (if the offline creation itself fails).
  [REISSUE_STATUSES.OFFLINE_REQUIRED]: [
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.OPS_PENDING]: [
    REISSUE_STATUSES.OPS_ASSIGNED,
    REISSUE_STATUSES.CANCELLED,
  ],
  [REISSUE_STATUSES.OPS_ASSIGNED]: [
    REISSUE_STATUSES.OPS_PROCESSING,
    REISSUE_STATUSES.CANCELLED,
  ],
  [REISSUE_STATUSES.OPS_PROCESSING]: [
    REISSUE_STATUSES.AWAITING_INTERNAL_SETTLEMENT,
    REISSUE_STATUSES.TICKET_UPLOADED,
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.AWAITING_INTERNAL_SETTLEMENT]: [
    REISSUE_STATUSES.TICKET_UPLOADED,
    REISSUE_STATUSES.COMPLETED,
    REISSUE_STATUSES.FAILED,
  ],
  [REISSUE_STATUSES.TICKET_UPLOADED]: [REISSUE_STATUSES.COMPLETED],
  [REISSUE_STATUSES.FAILED]: [REISSUE_STATUSES.PROCESSING],
  [REISSUE_STATUSES.CANCELLED]: [],
  [REISSUE_STATUSES.COMPLETED]: [],
});

// ── Offline reissue status transitions (isolated) ──
const OFFLINE_ALLOWED_TRANSITIONS = Object.freeze({
  [OFFLINE_STATUSES.PENDING_ASSIGNMENT]: [
    OFFLINE_STATUSES.ASSIGNED,
    OFFLINE_STATUSES.FAILED,
    OFFLINE_STATUSES.CANCELLED,
  ],
  [OFFLINE_STATUSES.RAISED]: [
    OFFLINE_STATUSES.ASSIGNED,
    OFFLINE_STATUSES.REJECTED,
    OFFLINE_STATUSES.FAILED,
  ],
  [OFFLINE_STATUSES.ASSIGNED]: [
    OFFLINE_STATUSES.IN_PROGRESS,
    OFFLINE_STATUSES.REJECTED,
    OFFLINE_STATUSES.FAILED,
  ],
  [OFFLINE_STATUSES.IN_PROGRESS]: [
    OFFLINE_STATUSES.WAITING_AIRLINE,
    OFFLINE_STATUSES.TICKET_GENERATED,
    OFFLINE_STATUSES.FAILED,
  ],
  [OFFLINE_STATUSES.WAITING_AIRLINE]: [
    OFFLINE_STATUSES.IN_PROGRESS,
    OFFLINE_STATUSES.TICKET_GENERATED,
    OFFLINE_STATUSES.FAILED,
  ],
  [OFFLINE_STATUSES.TICKET_GENERATED]: [
    OFFLINE_STATUSES.COMPLETED,
    OFFLINE_STATUSES.FAILED,
  ],
  [OFFLINE_STATUSES.COMPLETED]: [],
  [OFFLINE_STATUSES.FAILED]: [OFFLINE_STATUSES.IN_PROGRESS],
  [OFFLINE_STATUSES.REJECTED]: [],
  [OFFLINE_STATUSES.CANCELLED]: [],
});

function assertTransition(currentStatus, nextStatus, options = {}) {
  // Try online transitions first
  let allowed = ALLOWED_TRANSITIONS[currentStatus];

  // If not found in online, try offline transitions
  if (!allowed) {
    allowed = OFFLINE_ALLOWED_TRANSITIONS[currentStatus];
  }

  allowed = allowed || [];
  if (allowed.includes(nextStatus)) return;

  const isRecoveryRetry =
    currentStatus === REISSUE_STATUSES.FAILED &&
    nextStatus === REISSUE_STATUSES.PROCESSING &&
    options.allowRecoveryRetry === true;

  if (isRecoveryRetry) return;

  // Offline recovery retry
  const isOfflineRecoveryRetry =
    currentStatus === OFFLINE_STATUSES.FAILED &&
    nextStatus === OFFLINE_STATUSES.IN_PROGRESS &&
    options.allowRecoveryRetry === true;

  if (isOfflineRecoveryRetry) return;

  throw new ApiError(
    409,
    `Invalid reissue status transition: ${currentStatus} -> ${nextStatus}`,
  );
}

function canTransition(currentStatus, nextStatus, options = {}) {
  try {
    assertTransition(currentStatus, nextStatus, options);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      return false;
    }
    throw error;
  }
}

module.exports = {
  ALLOWED_TRANSITIONS,
  OFFLINE_ALLOWED_TRANSITIONS,
  assertTransition,
  canTransition,
};
