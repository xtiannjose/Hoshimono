import { countStep, type FunnelStep } from "@/lib/funnel";
import { clientIp, takeToken } from "@/lib/rate-limit";

// Funnel beacons from the browser (ADR 0017). The body is the step's name
// and nothing else. Orders are counted where they are placed.
const FROM_BROWSER = new Set<string>([
  "product_viewed",
  "added_to_cart",
  "checkout_started",
] satisfies FunnelStep[]);

// A shopper browsing fast sends a few a second; this only stops floods.
const PER_MINUTE = 120;

export async function POST(request: Request) {
  const step = (await request.text()).trim().slice(0, 40);
  if (!FROM_BROWSER.has(step)) return new Response(null, { status: 400 });
  const token = await takeToken(
    `events:ip:${clientIp(request.headers)}`,
    PER_MINUTE,
    60
  );
  if (!token.ok) return new Response(null, { status: 429 });
  await countStep(step as FunnelStep);
  return new Response(null, { status: 204 });
}
