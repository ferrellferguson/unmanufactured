/**
 * Adaptive polling intervals based on event age.
 *
 * Newer events get polled more frequently because narrative drift
 * is most likely in the first hours after a breaking event.
 */

const MINUTES = 60 * 1000;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

/** Minimum cooldown between polls regardless of tier (in ms). */
export const MIN_COOLDOWN_MS = 15 * MINUTES;

interface PollingTier {
  maxAge: number; // event age upper bound (ms)
  interval: number; // desired polling interval (ms)
  label: string;
}

const TIERS: PollingTier[] = [
  { maxAge: 6 * HOURS, interval: 30 * MINUTES, label: "breaking (30min)" },
  { maxAge: 24 * HOURS, interval: 2 * HOURS, label: "developing (2h)" },
  { maxAge: 3 * DAYS, interval: 6 * HOURS, label: "stabilizing (6h)" },
  { maxAge: 7 * DAYS, interval: 12 * HOURS, label: "cooling (12h)" },
  { maxAge: Infinity, interval: 24 * HOURS, label: "maintenance (24h)" },
];

/**
 * Returns the polling interval in milliseconds for an event based on its age.
 */
export function getPollingInterval(createdAt: Date | string): number {
  const age = Date.now() - new Date(createdAt).getTime();
  const tier = TIERS.find((t) => age < t.maxAge)!;
  return tier.interval;
}

/**
 * Returns true if enough time has passed since the last poll
 * to warrant a new poll cycle for this event.
 */
export function isDueForPoll(
  createdAt: Date | string,
  lastPolledAt: Date | string | null
): boolean {
  if (!lastPolledAt) return true;

  const interval = getPollingInterval(createdAt);
  const elapsed = Date.now() - new Date(lastPolledAt).getTime();

  return elapsed >= Math.max(interval, MIN_COOLDOWN_MS);
}
