/**
 * In-memory persistence for local/dev and unit tests.
 * TODO(live): swap for Postgres / Redis for production multi-instance.
 */

import type {
  AdminHoldItem,
  AuditLogEntry,
  EntitlementRecord,
  ProcessedEventRecord,
} from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Successful checkout markers for velocity (rolling window). */
export interface VelocityHit {
  key: string; // kind:value e.g. email:a@b.com
  at: number; // epoch ms
}

class MemoryStore {
  processedEvents = new Map<string, ProcessedEventRecord>();
  entitlements = new Map<string, EntitlementRecord>();
  auditLog: AuditLogEntry[] = [];
  adminHolds: AdminHoldItem[] = [];
  velocityHits: VelocityHit[] = [];
  /** cardFingerprint -> set of discordIds seen (cross-account flag). */
  cardToDiscords = new Map<string, Set<string>>();
  /** emails/discordIds under dispute cool-down until ISO date. */
  cooldowns = new Map<string, string>();
  /** Count of active premium members (for launch price switch). */
  activePremiumCount = 0;

  reset(): void {
    this.processedEvents.clear();
    this.entitlements.clear();
    this.auditLog = [];
    this.adminHolds = [];
    this.velocityHits = [];
    this.cardToDiscords.clear();
    this.cooldowns.clear();
    this.activePremiumCount = 0;
  }

  hasProcessedEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(
    eventId: string,
    type: string,
    outcome: string
  ): ProcessedEventRecord {
    const rec: ProcessedEventRecord = {
      eventId,
      type,
      processedAt: nowIso(),
      outcome,
    };
    this.processedEvents.set(eventId, rec);
    return rec;
  }

  appendAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const full: AuditLogEntry = {
      id: id('audit'),
      timestamp: nowIso(),
      ...entry,
    };
    this.auditLog.push(full);
    return full;
  }

  recordVelocity(kind: string, value: string): void {
    if (!value) return;
    this.velocityHits.push({ key: `${kind}:${value.toLowerCase()}`, at: Date.now() });
  }

  countVelocity(
    kind: string,
    value: string,
    windowMs: number
  ): number {
    if (!value) return 0;
    const key = `${kind}:${value.toLowerCase()}`;
    const cutoff = Date.now() - windowMs;
    // prune old
    this.velocityHits = this.velocityHits.filter((h) => h.at >= cutoff);
    return this.velocityHits.filter((h) => h.key === key).length;
  }

  trackCardDiscord(fingerprint: string, discordId: string): Set<string> {
    const set = this.cardToDiscords.get(fingerprint) ?? new Set<string>();
    set.add(discordId);
    this.cardToDiscords.set(fingerprint, set);
    return set;
  }

  setCooldown(key: string, untilIso: string): void {
    this.cooldowns.set(key.toLowerCase(), untilIso);
  }

  getCooldown(key: string): string | undefined {
    return this.cooldowns.get(key.toLowerCase());
  }

  isInCooldown(key: string, now = new Date()): boolean {
    const until = this.getCooldown(key);
    if (!until) return false;
    return new Date(until).getTime() > now.getTime();
  }

  upsertEntitlement(
    partial: Omit<EntitlementRecord, 'id' | 'updatedAt'> & { id?: string }
  ): EntitlementRecord {
    const existing = partial.id
      ? this.entitlements.get(partial.id)
      : [...this.entitlements.values()].find(
          (e) =>
            e.email.toLowerCase() === partial.email.toLowerCase() &&
            e.productId === partial.productId &&
            (partial.discordId
              ? e.discordId === partial.discordId
              : true)
        );

    const record: EntitlementRecord = {
      id: existing?.id ?? partial.id ?? id('ent'),
      email: partial.email,
      discordId: partial.discordId ?? existing?.discordId,
      productId: partial.productId,
      stripeCustomerId: partial.stripeCustomerId ?? existing?.stripeCustomerId,
      stripeSubscriptionId:
        partial.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
      stripePaymentId: partial.stripePaymentId ?? existing?.stripePaymentId,
      status: partial.status,
      grantedAt: partial.grantedAt ?? existing?.grantedAt,
      revokedAt: partial.revokedAt,
      revokeReason: partial.revokeReason,
      holdReason: partial.holdReason,
      cooldownUntil: partial.cooldownUntil ?? existing?.cooldownUntil,
      updatedAt: nowIso(),
    };
    this.entitlements.set(record.id, record);
    return record;
  }

  findEntitlementsByEmail(email: string): EntitlementRecord[] {
    return [...this.entitlements.values()].filter(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );
  }

  findEntitlementsByDiscord(discordId: string): EntitlementRecord[] {
    return [...this.entitlements.values()].filter(
      (e) => e.discordId === discordId
    );
  }

  findActiveByDiscord(discordId: string): EntitlementRecord[] {
    return this.findEntitlementsByDiscord(discordId).filter(
      (e) => e.status === 'active'
    );
  }

  addHold(item: Omit<AdminHoldItem, 'id' | 'createdAt' | 'status'>): AdminHoldItem {
    const hold: AdminHoldItem = {
      id: id('hold'),
      createdAt: nowIso(),
      status: 'pending',
      ...item,
    };
    this.adminHolds.push(hold);
    return hold;
  }

  listPendingHolds(): AdminHoldItem[] {
    return this.adminHolds.filter((h) => h.status === 'pending');
  }
}

export const store = new MemoryStore();
