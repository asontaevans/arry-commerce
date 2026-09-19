import { describe, expect, it } from 'vitest';
import {
  PRODUCTS,
  catalogForApi,
  selectAlertsProduct,
} from '../src/catalog/products';
import { config } from '../src/config';

describe('product catalog', () => {
  it('includes V1–V3 products', () => {
    const tiers = new Set(PRODUCTS.map((p) => p.tier));
    expect(tiers.has('v1')).toBe(true);
    expect(tiers.has('v2')).toBe(true);
    expect(tiers.has('v3')).toBe(true);
  });

  it('uses launch price before member cap', () => {
    const p = selectAlertsProduct(0);
    expect(p.id).toBe('alerts-premium-launch');
    expect(p.unitAmountCents).toBe(2900);
  });

  it('switches to standard after member cap', () => {
    const p = selectAlertsProduct(config.alertsLaunchMemberCap);
    expect(p.id).toBe('alerts-premium-standard');
    expect(p.unitAmountCents).toBe(4900);
  });

  it('does not expose balances or portfolio value figures in catalog copy', () => {
    const blob = JSON.stringify(PRODUCTS).toLowerCase();
    // Hard rule: no customer-facing exposure of balances / NAV figures
    expect(blob).not.toMatch(/account balance[s]?\s*[:=$]/);
    expect(blob).not.toMatch(/portfolio value/);
    expect(blob).not.toMatch(/\$\d[\d,]*\s*(nav|equity|balance)/);
    expect(blob).not.toMatch(/\bnav\s*[:=]/);
    // Compliance note present on API catalog
    const cat = catalogForApi(0);
    expect(cat.complianceNote.toLowerCase()).toContain('never');
  });

  it('exposes discord invite and free channel ids', () => {
    const cat = catalogForApi(0);
    expect(cat.discordInvite).toContain('discord.gg');
    expect(cat.freeChannels.watchlist).toBe('1550682674744533055');
    expect(cat.freeChannels.activeTrades).toBe('1550993031606435963');
  });
});
