import { takeToken } from "@/lib/rate-limit";

const ORDERS_PER_HOUR = 10;
const ORDERS_PER_HOUR_PER_IP = 20;

/**
 * COD Orders reserve stock unpaid, so cap how many one account or one IP
 * can place in an hour (docs/03 section 12). Each call spends one attempt.
 */
export async function takeOrderAttempt(
  customerId: string,
  ip: string,
  now = new Date()
): Promise<boolean> {
  for (const [key, limit] of [
    [`order:customer:${customerId}`, ORDERS_PER_HOUR],
    [`order:ip:${ip}`, ORDERS_PER_HOUR_PER_IP],
  ] as const) {
    if (!(await takeToken(key, limit, 60 * 60, now)).ok) return false;
  }
  return true;
}
