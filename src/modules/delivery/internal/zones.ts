import { db } from "@/lib/db";
import type { ZoneFees } from "@/modules/pricing";

export type ZoneMatch = {
  zoneId: string;
  hubId: string;
  name: string;
  fees: ZoneFees;
};

/** "City of Pasig", "pasig city" and "Pásig" all compare as "pasig". */
function placeKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^city of /, "")
    .replace(/ city$/, "");
}

async function activeZones() {
  return db.zone.findMany({
    where: { hub: { isActive: true } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * The Zone that delivers to a city and barangay, or null when none does.
 * A Zone with listed barangays serves only those; one without serves the
 * whole city. A barangay match wins over a whole-city match.
 * shortcut: names, not map polygons, until maps arrive (Batch 2.3 deferral).
 */
export async function resolveZone(place: {
  city: string;
  barangay: string;
}): Promise<ZoneMatch | null> {
  const city = placeKey(place.city);
  const barangay = placeKey(place.barangay);
  const zones = (await activeZones()).filter((z) =>
    z.cities.some((c) => placeKey(c) === city)
  );
  const zone =
    zones.find((z) => z.barangays.some((b) => placeKey(b) === barangay)) ??
    zones.find((z) => z.barangays.length === 0);
  return zone ? toMatch(zone) : null;
}

function toMatch(
  zone: Awaited<ReturnType<typeof activeZones>>[number]
): ZoneMatch {
  return {
    zoneId: zone.id,
    hubId: zone.hubId,
    name: zone.name,
    fees: {
      deliveryFeeCents: zone.deliveryFeeCents,
      freeDeliveryOverCents: zone.freeDeliveryOverCents,
      minOrderCents: zone.minOrderCents,
    },
  };
}

/** Served cities for the address form; barangays null means the whole city. */
export async function listServiceAreas(): Promise<
  { city: string; barangays: string[] | null }[]
> {
  const areas = new Map<string, string[] | null>();
  for (const zone of await activeZones()) {
    for (const city of zone.cities) {
      const known = areas.get(city);
      if (zone.barangays.length === 0 || known === null) areas.set(city, null);
      else areas.set(city, [...(known ?? []), ...zone.barangays]);
    }
  }
  return [...areas]
    .map(([city, barangays]) => ({ city, barangays }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

export type ZoneCoverage = {
  name: string;
  cities: string[];
  /** Empty means every barangay of the cities. */
  barangays: string[];
  deliveryFeeCents: number;
  freeDeliveryOverCents: number | null;
  minOrderCents: number;
};

/** Every served Zone with its fees, for the public coverage page. */
export async function listCoverage(): Promise<ZoneCoverage[]> {
  return (await activeZones()).map((z) => ({
    name: z.name,
    cities: z.cities,
    barangays: z.barangays,
    deliveryFeeCents: z.deliveryFeeCents,
    freeDeliveryOverCents: z.freeDeliveryOverCents,
    minOrderCents: z.minOrderCents,
  }));
}
