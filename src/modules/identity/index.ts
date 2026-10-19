// Public interface of the identity module (docs/03-ARCHITECTURE.md section 3).
// Owns sign-in, sessions, Staff roles and the audit log.
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "./internal/auth";

/** Better Auth endpoints for /api/auth/[...all]. */
export const authHandler = toNextJsHandler(auth);

export { recordAudits, type AuditEntry } from "./internal/audit";
export { googleEnabled } from "./internal/auth";
export { staffForUser } from "./internal/link";
export {
  currentCustomer,
  getStaff,
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
