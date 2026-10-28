// Public interface of the jobs module (docs/03-ARCHITECTURE.md section 11).
// Owns the jobs outbox; the cron route runs it every minute.
export {
  enqueueJob,
  jobsHealth,
  MAX_ATTEMPTS,
  purgeDoneJobs,
  runDueJobs,
} from "./internal/jobs";
export type { JobHandlers, RunReport } from "./internal/jobs";
