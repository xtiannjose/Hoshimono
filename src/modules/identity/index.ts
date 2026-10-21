// Public interface of the identity module (docs/03-ARCHITECTURE.md section 3).
// Owns sign-in, sessions, Staff roles and the audit log.
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "./internal/auth";

/** Better Auth endpoints for /api/auth/[...all]. */
export const authHandler = toNextJsHandler(auth);

export { recordAudits, type AuditEntry } from "./internal/audit";
export {
  addStaff,
  listAudits,
  listRiders,
  listStaff,
  updateStaff,
  type AuditRow,
  type StaffRow,
} from "./internal/staff";
export { googleEnabled } from "./internal/auth";
export { staffAreas, staffForUser, type StaffArea } from "./internal/link";
export {
  currentCustomer,
  currentStaff,
  getStaff,
  requireAnyStaff,
  requireCustomer,
  requireStaff,
  signOut,
} from "./internal/session";
export {
  emailSignInLink,
  googleSignInUrl,
  safeNext,
  textSignInCode,
  verifySignInCode,
} from "./internal/sign-in";
