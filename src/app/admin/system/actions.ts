"use server";

import { refresh } from "next/cache";

import { recordAudits, requireStaff } from "@/modules/identity";
import { retryJob } from "@/modules/jobs";

/** A job that gave up runs again from the next cron tick, audited. */
export async function retryJobAction(fd: FormData): Promise<void> {
  const staff = await requireStaff("setup", "/admin/system");
  const id = String(fd.get("jobId") ?? "");
  if (await retryJob(id)) {
    await recordAudits([
      { staffId: staff.id, action: "retry", entity: "job", entityId: id },
    ]);
  }
  refresh();
}
