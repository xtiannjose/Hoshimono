// Public interface of the claims module (docs/03-ARCHITECTURE.md section 3).
// Owns Freshness Claims (ADR 0016). Staff writes: callers check
// requireStaff("claims") first.
export {
  CLAIM_WINDOW_HOURS,
  claimableLines,
  countClaims,
  fileClaim,
  listOrderClaims,
} from "./internal/claims";
export type { ClaimableLine, ClaimInput } from "./internal/claims";
export {
  CLAIM_DECIDED_JOB,
  decideClaim,
  getClaimForStaff,
  getClaimNotice,
  listClaimsForStaff,
} from "./internal/decide";
export type { ClaimDecision, DecideResult } from "./internal/decide";
export { MAX_PHOTOS } from "./internal/photos";
export { claimValue } from "./internal/value";
