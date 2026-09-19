import { beforeEach, describe, expect, it } from 'vitest';
import {
  getEntitlementStatus,
  grantEntitlement,
  revokeEntitlements,
} from '../src/entitlements/service';
import { store } from '../src/store/memoryStore';

beforeEach(() => {
  store.reset();
});

describe('entitlements service', () => {
  it('grants and reports active status', async () => {
    const out = await grantEntitlement({
      email: 'ok@example.com',
      discordId: 'd_ok',
      productId: 'alerts-premium-launch',
    });
    expect(out.decision).toBe('allow');
    expect(out.discord?.stubbed).toBe(true);
    const status = getEntitlementStatus('d_ok');
    expect(status.active).toBe(true);
  });

  it('does not grant when fraud blocks', async () => {
    const out = await grantEntitlement({
      email: '',
      discordId: 'd_x',
      productId: 'alerts-premium-launch',
    });
    expect(out.decision).toBe('block');
    expect(getEntitlementStatus('d_x').active).toBe(false);
  });

  it('revokes active entitlements', async () => {
    await grantEntitlement({
      email: 'r@example.com',
      discordId: 'd_r',
      productId: 'alerts-premium-launch',
    });
    const { revoked } = await revokeEntitlements({
      discordId: 'd_r',
      email: 'r@example.com',
      reason: 'test_revoke',
    });
    expect(revoked.length).toBeGreaterThan(0);
    expect(getEntitlementStatus('d_r').active).toBe(false);
  });
});
