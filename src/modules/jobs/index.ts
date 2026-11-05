// Public interface of the jobs module (docs/03-ARCHITECTURE.md section 11).
// Owns the jobs outbox; the cron route runs it every minute.
export {
  CRON_TICK,
  cronStatus,
  enqueueJob,
  jobsHealth,
  lastHeartbeat,
  listOpenJobs,
  MAX_ATTEMPTS,
  recordHeartbeat,
  purgeDoneJobs,
  retryJob,
  runDueJobs,
} from "./internal/jobs";
export type { JobHandlers, RunReport } from "./internal/jobs";
